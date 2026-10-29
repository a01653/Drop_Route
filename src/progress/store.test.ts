import { describe, expect, it, vi } from 'vitest'
import { catalog, routesDocument } from '../data'
import { inversionFromBass } from '../music/pitch'
import { defaultConfig, voicingOf } from '../session'
import type { ConfigChange, QuestionState, RouteQuestionState } from '../session'
import { DAMAGED_COPY_KEY, SCHEMA_VERSION, STORAGE_KEY, createAppStore, migratedCopyKey, parseDocument, serialize } from '.'
import type { AppStore } from '.'
import schema0 from './fixtures/schema-0.json'
import { createMemoryStorage } from './memory-storage'
import type { MemoryStorage } from './memory-storage'

const open = (storage: MemoryStorage | null | undefined) => createAppStore({ storage })
const stored = (storage: MemoryStorage) => JSON.parse(storage.data.get(STORAGE_KEY) ?? 'null')

function configure(store: AppStore, change: ConfigChange) {
  store.dispatch({ type: 'configure', change })
}

/** Empieza una partida de reconocimiento y la contesta bien (o mal) hasta verificar. */
function playRecognition(store: AppStore, right = true) {
  store.dispatch({ type: 'exit' })
  store.dispatch({ type: 'start', seed: 7 })
  const session = store.getSnapshot().session as QuestionState
  const voicing = voicingOf(catalog, session.question)
  const wrong = (['maj7', '7', 'm7', 'm7b5'] as const).find((quality) => quality !== voicing.quality)!
  store.dispatch({ type: 'choose', change: { quality: right ? voicing.quality : wrong } })
  if (session.question.difficulty !== 'easy') {
    store.dispatch({ type: 'choose', change: { inversion: inversionFromBass(voicing, catalog) } })
  }
  store.dispatch({ type: 'verify' })
}

function playRoute(store: AppStore, right = true) {
  store.dispatch({ type: 'exit' })
  store.dispatch({ type: 'start', seed: 7 })
  const { question } = store.getSnapshot().session as RouteQuestionState
  const expected = question.candidateRouteIds.indexOf(question.routeId)
  store.dispatch({ type: 'candidate', index: right ? expected : (expected + 1) % 4 })
  store.dispatch({ type: 'verify' })
}

describe('sin almacenamiento o con el almacenamiento inutilizable se juega en memoria', () => {
  it('sin persistencia configurada no hay aviso, ni escrituras, y los contadores funcionan', () => {
    const store = open(undefined)
    expect(store.getSnapshot().notice).toBeNull()
    playRecognition(store)
    expect(store.getSnapshot().progress['recognition:D2S1:easy']).toEqual({ attempts: 1, correct: 1 })
  })

  it('almacenamiento bloqueado (null): aviso, y el juego sigue siendo utilizable', () => {
    const store = open(null)
    expect(store.getSnapshot().notice).toBe('unavailable')
    configure(store, { difficulty: 'medium' })
    playRecognition(store)
    playRecognition(store, false)
    const snapshot = store.getSnapshot()
    expect(snapshot.notice).toBe('unavailable')
    expect(snapshot.progress['recognition:D2S1:medium']).toEqual({ attempts: 2, correct: 1 })
  })

  it('lectura que lanza (acceso denegado): aviso, y no se intenta escribir', () => {
    const storage = createMemoryStorage()
    storage.failGet = true
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('unavailable')
    playRecognition(store)
    expect(store.getSnapshot().progress['recognition:D2S1:easy']).toEqual({ attempts: 1, correct: 1 })
    expect(storage.writes).toEqual([])
  })

  it('almacenamiento lleno: aviso, el juego sigue en memoria y se guarda en cuanto se puede', () => {
    const storage = createMemoryStorage()
    const store = open(storage)
    storage.failSet = () => true
    configure(store, { difficulty: 'medium' })
    expect(store.getSnapshot().notice).toBe('write-failed')
    playRecognition(store)
    playRecognition(store, false)
    expect(store.getSnapshot().notice).toBe('write-failed')
    expect(store.getSnapshot().progress['recognition:D2S1:medium']).toEqual({ attempts: 2, correct: 1 })
    expect(storage.data.has(STORAGE_KEY)).toBe(false)

    storage.failSet = () => false
    store.dispatch({ type: 'exit' })
    playRecognition(store)
    expect(store.getSnapshot().notice).toBeNull()
    // Lo guardado incluye todo lo acumulado mientras no se pudo escribir.
    expect(stored(storage).progress['recognition:D2S1:medium']).toEqual({ attempts: 3, correct: 2 })
  })
})

describe('configuración y progreso se conservan al recargar', () => {
  it('la configuración elegida vuelve al abrir, siempre en el menú', () => {
    const storage = createMemoryStorage()
    const first = open(storage)
    configure(first, { game: 'routes', drop: 'drop2', setId: 'D2S2', routeMode: 'minor', stretch: 'both' })
    const second = open(storage)
    expect(second.getSnapshot().session).toEqual({
      phase: 'menu',
      config: {
        game: 'routes', drop: 'drop2', setId: 'D2S2', difficulty: 'easy', routeMode: 'minor', stretch: 'both',
        scaleId: 'major', scaleKey: 0,
      },
    })
    expect(second.getSnapshot().notice).toBeNull()
  })

  it('los contadores vuelven al abrir y siguen acumulando sobre lo guardado', () => {
    const storage = createMemoryStorage()
    const first = open(storage)
    configure(first, { drop: 'drop3', setId: 'D3S2', difficulty: 'medium' })
    playRecognition(first)
    playRecognition(first, false)
    first.dispatch({ type: 'exit' })
    configure(first, { game: 'routes', drop: 'drop2', setId: 'D2S1', routeMode: 'major', stretch: 'both' })
    playRoute(first)

    const second = open(storage)
    expect(second.getSnapshot().progress).toEqual({
      'recognition:D3S2:medium': { attempts: 2, correct: 1 },
      'routes:D2S1:major:ii-v': { attempts: 1, correct: 1 },
    })
    second.dispatch({ type: 'start', seed: 4 })
    second.dispatch({ type: 'verify' })
    expect(second.getSnapshot().progress['routes:D2S1:major:ii-v']?.attempts).toBe(2)
    expect(open(storage).getSnapshot().progress['routes:D2S1:major:ii-v']?.attempts).toBe(2)
  })

  it('una pregunta abierta no se reanuda ni se cuenta al recargar', () => {
    const storage = createMemoryStorage()
    const first = open(storage)
    configure(first, { difficulty: 'medium' })
    first.dispatch({ type: 'start', seed: 3 })
    expect(first.getSnapshot().session.phase).toBe('pregunta')
    const second = open(storage)
    expect(second.getSnapshot().session.phase).toBe('menu')
    expect(second.getSnapshot().session.config.difficulty).toBe('medium')
    expect(second.getSnapshot().progress).toEqual({})
  })

  it('una verificación se escribe una sola vez y lo que no cambia nada no escribe', () => {
    const storage = createMemoryStorage()
    const store = open(storage)
    playRecognition(store)
    const writes = storage.writes.length
    store.dispatch({ type: 'verify' })
    store.dispatch({ type: 'verify' })
    store.dispatch({ type: 'choose', change: { quality: 'm7' } })
    expect(storage.writes).toHaveLength(writes)
    expect(stored(storage).progress['recognition:D2S1:easy']).toEqual({ attempts: 1, correct: 1 })
    // Siguiente y Salir tampoco escriben: ni la configuración ni los contadores cambian.
    store.dispatch({ type: 'next', seed: 2 })
    store.dispatch({ type: 'exit' })
    expect(storage.writes).toHaveLength(writes)
    // Elegir lo que ya estaba elegido tampoco.
    configure(store, { difficulty: 'easy' })
    expect(storage.writes).toHaveLength(writes)
  })

  it('lo escrito es un documento del esquema actual que el parser reconoce sin reparar', () => {
    const storage = createMemoryStorage()
    const store = open(storage)
    playRecognition(store)
    const result = parseDocument(storage.data.get(STORAGE_KEY)!, catalog, routesDocument)
    expect(result).toMatchObject({ status: 'loaded', migratedFrom: null, repaired: false })
  })
})

describe('datos dañados, reparados y de una versión futura', () => {
  const GOOD = { 'recognition:D2S1:easy': { attempts: 3, correct: 2 } }

  it('dañado: se conserva una copia, se avisa y se empieza de cero sin tocar lo guardado hasta el primer cambio', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{"schemaVersion":1,' })
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('damaged')
    expect(store.getSnapshot().progress).toEqual({})
    expect(storage.data.get(DAMAGED_COPY_KEY)).toBe('{"schemaVersion":1,')
    expect(storage.data.get(STORAGE_KEY)).toBe('{"schemaVersion":1,')
    configure(store, { difficulty: 'medium' })
    expect(stored(storage)).toMatchObject({ schemaVersion: SCHEMA_VERSION, config: { difficulty: 'medium' }, progress: {} })
    expect(storage.data.get(DAMAGED_COPY_KEY)).toBe('{"schemaVersion":1,')
  })

  it('dañado y sin poder copiarlo: no se sobrescribe nada, se juega en memoria y el aviso no promete una copia', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: 'esto no es json' })
    storage.failSet = (key) => key === DAMAGED_COPY_KEY
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('damaged-uncopied')
    configure(store, { difficulty: 'medium' })
    playRecognition(store)
    expect(store.getSnapshot().progress['recognition:D2S1:medium']).toEqual({ attempts: 1, correct: 1 })
    expect(storage.data.get(STORAGE_KEY)).toBe('esto no es json')
    expect(storage.writes).toEqual([])
    expect(storage.data.has(DAMAGED_COPY_KEY)).toBe(false)
    store.dismissNotice()
    expect(store.getSnapshot().notice).toBe('damaged-uncopied')
  })

  it('futuro: se conserva sin sobrescribir, ni al jugar ni al configurar, y no se puede cerrar el aviso', () => {
    const future = JSON.stringify({ schemaVersion: 99, progreso: 'de otra versión', config: { lo: 'que sea' } })
    const storage = createMemoryStorage({ [STORAGE_KEY]: future })
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('future')
    configure(store, { difficulty: 'medium' })
    playRecognition(store)
    store.dispatch({ type: 'exit' })
    store.dismissNotice()
    expect(store.getSnapshot().notice).toBe('future')
    // La sesión sigue siendo utilizable y cuenta en memoria.
    expect(store.getSnapshot().progress['recognition:D2S1:medium']).toEqual({ attempts: 1, correct: 1 })
    // Pero lo guardado es byte a byte lo que había, y no se escribió ninguna clave.
    expect(storage.data.get(STORAGE_KEY)).toBe(future)
    expect(storage.writes).toEqual([])
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY])
  })

  it('reparado: conserva los contadores válidos, descarta los inválidos y guarda una copia del original', () => {
    const raw = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      config: { ...defaultConfig(catalog), difficulty: 'hard' },
      progress: { ...GOOD, 'recognition:D2S1:hard': { attempts: 1, correct: 9 }, 'routes:D2S2:minor:ii-v': { attempts: 4, correct: 1 } },
    })
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('repaired')
    expect(store.getSnapshot().progress).toEqual({ ...GOOD, 'routes:D2S2:minor:ii-v': { attempts: 4, correct: 1 } })
    expect(store.getSnapshot().session.config.difficulty).toBe('hard')
    expect(storage.data.get(DAMAGED_COPY_KEY)).toBe(raw)
    expect(stored(storage).progress).toEqual(store.getSnapshot().progress)
    store.dismissNotice()
    expect(store.getSnapshot().notice).toBeNull()
  })

  it('reparado y sin poder copiar el original: no se reescribe, se conservan los contadores válidos en memoria y se avisa', () => {
    const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, config: defaultConfig(catalog), progress: { ...GOOD, 'recognition:D2S1:hard': { attempts: -3, correct: 0 } } })
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    storage.failSet = (key) => key === DAMAGED_COPY_KEY
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('repaired-uncopied')
    expect(store.getSnapshot().progress).toEqual(GOOD)
    playRecognition(store)
    expect(store.getSnapshot().progress['recognition:D2S1:easy']).toEqual({ attempts: 4, correct: 3 })
    expect(storage.data.get(STORAGE_KEY)).toBe(raw)
    expect(storage.writes).toEqual([])
    store.dismissNotice()
    expect(store.getSnapshot().notice).toBe('repaired-uncopied')
  })

  it('un contador válido no se pierde por haber otros inválidos al volver a abrir', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: SCHEMA_VERSION, config: defaultConfig(catalog), progress: { ...GOOD, 'recognition:D2S1:medium': 'mal' } }) })
    const first = open(storage)
    playRecognition(first)
    expect(open(storage).getSnapshot().progress).toEqual({ 'recognition:D2S1:easy': { attempts: 4, correct: 3 } })
    expect(open(storage).getSnapshot().notice).toBeNull()
  })
})

describe('migración del esquema 0 (documento de prueba)', () => {
  const raw = JSON.stringify(schema0)

  it('migra, conserva el original y escribe el documento actual', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    const store = open(storage)
    expect(store.getSnapshot().notice).toBeNull()
    expect(store.getSnapshot().progress['routes:D2S2:minor:ii-v']).toEqual({ attempts: 5, correct: 3 })
    expect(store.getSnapshot().session.config).toMatchObject({ game: 'routes', drop: 'drop2', setId: 'D2S2' })
    expect(storage.data.get(migratedCopyKey(0))).toBe(raw)
    expect(stored(storage).schemaVersion).toBe(SCHEMA_VERSION)
    expect(stored(storage).progress).toEqual(store.getSnapshot().progress)
    // Al volver a abrir ya es del esquema actual: no se migra ni se copia otra vez.
    const writes = storage.writes.length
    expect(open(storage).getSnapshot().progress).toEqual(store.getSnapshot().progress)
    expect(storage.writes).toHaveLength(writes)
  })

  it('sin poder conservar el original no se reescribe: se juega en memoria y se avisa', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    storage.failSet = (key) => key === migratedCopyKey(0)
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('migration-uncopied')
    expect(store.getSnapshot().progress['recognition:D2S1:easy']).toEqual({ attempts: 10, correct: 7 })
    configure(store, { game: 'recognition', difficulty: 'easy', setId: 'D2S1', drop: 'drop2' })
    playRecognition(store)
    expect(store.getSnapshot().progress['recognition:D2S1:easy']).toEqual({ attempts: 11, correct: 8 })
    expect(storage.data.get(STORAGE_KEY)).toBe(raw)
    expect(storage.writes).toEqual([])
  })

  it('con la copia hecha pero sin poder escribir el documento nuevo: el original sigue intacto y se avisa', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    storage.failSet = (key) => key === STORAGE_KEY
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('write-failed')
    expect(storage.data.get(migratedCopyKey(0))).toBe(raw)
    expect(storage.data.get(STORAGE_KEY)).toBe(raw)
    expect(store.getSnapshot().progress['recognition:D24S1:hard']).toEqual({ attempts: 4, correct: 1 })
  })
})

describe('migración del esquema 1 al 2 (juegos de escalas)', () => {
  const v1 = {
    schemaVersion: 1,
    config: { game: 'routes', drop: 'drop2', setId: 'D2S2', difficulty: 'hard', routeMode: 'minor', stretch: 'v-i' },
    progress: { 'recognition:D2S1:easy': { attempts: 3, correct: 2 }, 'routes:D2S2:minor:v-i': { attempts: 2, correct: 1 } },
  }
  const raw = JSON.stringify(v1)

  it('conserva configuración y contadores, guarda el original y añade escala y tonalidad por defecto sin avisar', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    const store = open(storage)
    expect(store.getSnapshot().notice).toBeNull()
    expect(store.getSnapshot().progress).toEqual(v1.progress)
    expect(store.getSnapshot().session.config).toEqual({ ...v1.config, scaleId: 'major', scaleKey: 0 })
    expect(storage.data.get(migratedCopyKey(1))).toBe(raw)
    expect(stored(storage)).toEqual({ schemaVersion: 2, config: { ...v1.config, scaleId: 'major', scaleKey: 0 }, progress: v1.progress })
  })

  it('sin poder conservar el original no se reescribe y se avisa', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })
    storage.failSet = (key) => key === migratedCopyKey(1)
    const store = open(storage)
    expect(store.getSnapshot().notice).toBe('migration-uncopied')
    expect(storage.data.get(STORAGE_KEY)).toBe(raw)
    expect(storage.writes).toEqual([])
  })

  it('los contadores de escalas se guardan y vuelven al abrir', () => {
    const storage = createMemoryStorage()
    const first = open(storage)
    configure(first, { game: 'scale-order', scaleId: 'minor-pentatonic', scaleKey: 4 })
    first.dispatch({ type: 'start', seed: 3 })
    for (let card = 0; card < 5; card += 1) first.dispatch({ type: 'order-pick', card })
    first.dispatch({ type: 'verify' })
    const counter = first.getSnapshot().progress['scale-order:minor-pentatonic']
    expect(counter?.attempts).toBe(1)
    const second = open(storage)
    expect(second.getSnapshot().progress['scale-order:minor-pentatonic']).toEqual(counter)
    expect(second.getSnapshot().session.config).toMatchObject({ game: 'scale-order', scaleId: 'minor-pentatonic', scaleKey: 4 })
  })
})

describe('suscripción', () => {
  it('avisa de cada cambio, no avisa si nada cambia y permite darse de baja', () => {
    const store = open(createMemoryStorage())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const initial = store.getSnapshot()
    store.dispatch({ type: 'verify' })
    store.dispatch({ type: 'next', seed: 1 })
    expect(listener).not.toHaveBeenCalled()
    expect(store.getSnapshot()).toBe(initial)
    configure(store, { difficulty: 'medium' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(initial)
    unsubscribe()
    configure(store, { difficulty: 'hard' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('serialize y la configuración por defecto no dependen del almacén', () => {
    const config = defaultConfig(catalog)
    expect(JSON.parse(serialize(config, {}))).toEqual({ schemaVersion: SCHEMA_VERSION, config, progress: {} })
  })
})
