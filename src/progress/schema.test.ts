import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../data'
import { defaultConfig, routeSetIds } from '../session'
import { SCHEMA_VERSION, parseDocument, sanitizeConfig, serialize } from '.'
import type { ParseResult } from '.'
import schema0 from './fixtures/schema-0.json'

const parse = (value: unknown): ParseResult =>
  parseDocument(typeof value === 'string' ? value : JSON.stringify(value), catalog, routesDocument)
const doc = (progress: unknown, config: unknown = defaultConfig(catalog)) => ({ schemaVersion: SCHEMA_VERSION, config, progress })
const loaded = (result: ParseResult) => {
  if (result.status !== 'loaded') throw new Error(`se esperaba «loaded» y es «${result.status}»`)
  return result
}

describe('lectura del documento guardado', () => {
  it('sin nada guardado está vacío', () => {
    expect(parseDocument(null, catalog, routesDocument)).toEqual({ status: 'empty' })
  })

  it('un documento propio se lee sin reparar y se vuelve a escribir igual', () => {
    const config = { ...defaultConfig(catalog), game: 'routes' as const, drop: 'drop2' as const, setId: 'D2S2' as const, routeMode: 'minor' as const, stretch: 'both' as const }
    const progress = { 'recognition:D2S1:easy': { attempts: 3, correct: 2 }, 'routes:D2S2:minor:v-i': { attempts: 1, correct: 0 } }
    const text = serialize(config, progress)
    const result = loaded(parse(text))
    expect(result).toMatchObject({ config, progress, migratedFrom: null, repaired: false })
    expect(serialize(result.config, result.progress)).toBe(text)
  })

  it('serializa con orden estable: dos estados iguales dan el mismo texto', () => {
    const config = defaultConfig(catalog)
    const a = { 'routes:D2S1:major:ii-v': { attempts: 1, correct: 1 }, 'recognition:D2S1:easy': { attempts: 2, correct: 1 } }
    const b = { 'recognition:D2S1:easy': { attempts: 2, correct: 1 }, 'routes:D2S1:major:ii-v': { attempts: 1, correct: 1 } }
    expect(serialize(config, a)).toBe(serialize(config, b))
  })

  it.each([
    ['texto vacío', ''],
    ['JSON truncado', '{"schemaVersion":1,'],
    ['null', 'null'],
    ['un array', '[]'],
    ['un número', '3'],
    ['sin versión', '{}'],
    ['versión como texto', '{"schemaVersion":"1","progress":{}}'],
    ['versión negativa', '{"schemaVersion":-1,"progress":{}}'],
    ['versión con decimales', '{"schemaVersion":1.5,"progress":{}}'],
    ['sin contadores', '{"schemaVersion":1}'],
    ['contadores que son un array', '{"schemaVersion":1,"progress":[]}'],
  ])('está dañado: %s', (_name, text) => {
    expect(parse(text).status).toBe('damaged')
  })

  it('una versión futura se reconoce sin interpretarla, sea cual sea su contenido', () => {
    expect(parse({ schemaVersion: SCHEMA_VERSION + 1, lo: 'que sea' })).toEqual({ status: 'future', version: SCHEMA_VERSION + 1 })
    expect(parse('{"schemaVersion":99}')).toEqual({ status: 'future', version: 99 })
  })
})

describe('validación de contadores: se descarta lo inválido y se conserva lo válido', () => {
  const good = { 'recognition:D2S1:easy': { attempts: 3, correct: 2 }, 'routes:D2S1:major:ii-v': { attempts: 4, correct: 4 } }

  it('descarta claves desconocidas y valores imposibles, y cuenta lo descartado', () => {
    const text =
      '{"schemaVersion":1,"progress":{' +
      '"recognition:D2S1:easy":{"attempts":3,"correct":2},' +
      '"routes:D2S1:major:ii-v":{"attempts":4,"correct":4},' +
      '"recognition:D2S1:medium":{"attempts":-1,"correct":0},' +
      '"recognition:D2S1:hard":{"attempts":2.5,"correct":1},' +
      '"recognition:D2S2:easy":{"attempts":2,"correct":3},' +
      '"recognition:D2S2:medium":{"attempts":"2","correct":1},' +
      '"recognition:D2S2:hard":{"attempts":1e308,"correct":1},' +
      '"recognition:D2S3:easy":null,' +
      '"recognition:D2S3:medium":[],' +
      '"recognition:D2S1:imposible":{"attempts":1,"correct":1},' +
      '"routes:D2S3:major:ii-v":{"attempts":1,"correct":1},' +
      '"routes:D2S1:major:both":{"attempts":1,"correct":1},' +
      '"__proto__":{"attempts":9,"correct":9}}}'
    const result = loaded(parse(text))
    expect(result.progress).toEqual(good)
    expect(result.repaired).toBe(true)
    expect(Object.getPrototypeOf(result.progress)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).attempts).toBeUndefined()
  })

  it('un documento limpio no se marca como reparado, ni siquiera con cero intentos', () => {
    const result = loaded(parse(doc({ ...good, 'recognition:D2S1:hard': { attempts: 0, correct: 0 } })))
    expect(result.repaired).toBe(false)
  })

  it('solo acepta los contadores de sets y modos que existen: reconocimiento en todos, rutas en los que tienen rutas', () => {
    expect([...routeSetIds(routesDocument)].sort()).toEqual(['D2S1', 'D2S2'])
    const result = loaded(parse(doc({ 'recognition:D24S2:hard': { attempts: 1, correct: 1 }, 'routes:D24S2:major:ii-v': { attempts: 1, correct: 1 } })))
    expect(Object.keys(result.progress)).toEqual(['recognition:D24S2:hard'])
  })
})

describe('validación de la configuración', () => {
  it('una configuración válida se conserva tal cual', () => {
    const config = { game: 'routes', drop: 'drop2', setId: 'D2S2', difficulty: 'hard', routeMode: 'minor', stretch: 'v-i' } as const
    expect(sanitizeConfig(config, catalog, routesDocument)).toEqual({ config, repaired: false })
  })

  it('un campo desconocido vuelve a su valor por defecto y se avisa', () => {
    const defaults = defaultConfig(catalog)
    const { config, repaired } = sanitizeConfig({ ...defaults, difficulty: 'imposible', routeMode: 7 }, catalog, routesDocument)
    expect(repaired).toBe(true)
    expect(config).toEqual(defaults)
  })

  it('sin configuración usa la de por defecto y se avisa', () => {
    expect(sanitizeConfig(undefined, catalog, routesDocument)).toEqual({ config: defaultConfig(catalog), repaired: true })
    expect(sanitizeConfig([], catalog, routesDocument).repaired).toBe(true)
  })

  it('un set sin rutas no puede quedar en el juego de rutas', () => {
    const { config, repaired } = sanitizeConfig(
      { game: 'routes', drop: 'drop3', setId: 'D3S1', difficulty: 'easy', routeMode: 'major', stretch: 'ii-v' },
      catalog,
      routesDocument,
    )
    expect(repaired).toBe(true)
    expect(config.game).toBe('routes')
    expect(routeSetIds(routesDocument)).toContain(config.setId)
  })

  it('un set que no pertenece al Drop se corrige y la configuración queda coherente', () => {
    const { config, repaired } = sanitizeConfig(
      { game: 'recognition', drop: 'drop3', setId: 'D2S1', difficulty: 'easy', routeMode: 'major', stretch: 'ii-v' },
      catalog,
      routesDocument,
    )
    expect(repaired).toBe(true)
    expect(catalog.sets.find((set) => set.id === config.setId)?.drop).toBe(config.drop)
  })

  it('un Drop ausente se deduce del set y no cuenta como corrección', () => {
    const { config, repaired } = sanitizeConfig(
      { game: 'recognition', setId: 'D24S2', difficulty: 'medium', routeMode: 'minor', stretch: 'both' },
      catalog,
      routesDocument,
    )
    expect(repaired).toBe(false)
    expect(config).toMatchObject({ drop: 'drop2+4', setId: 'D24S2', difficulty: 'medium' })
  })

  it('un documento con la configuración rota conserva sus contadores válidos', () => {
    const progress = { 'recognition:D2S1:easy': { attempts: 5, correct: 4 } }
    const result = loaded(parse(doc(progress, { game: 'nada' })))
    expect(result.repaired).toBe(true)
    expect(result.progress).toEqual(progress)
    expect(result.config).toEqual(defaultConfig(catalog))
  })
})

describe('migración desde el esquema 0 (documento de prueba, no una versión publicada)', () => {
  const text = JSON.stringify(schema0)

  it('el fixture es un documento del esquema 0 y no del actual', () => {
    expect(schema0.schemaVersion).toBe(0)
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
    expect(schema0.config).not.toHaveProperty('drop')
    expect(schema0).toHaveProperty('counters')
    expect(schema0).not.toHaveProperty('progress')
  })

  it('convierte contadores, claves y configuración sin perder ni inventar nada', () => {
    const result = loaded(parse(text))
    expect(result.migratedFrom).toBe(0)
    expect(result.repaired).toBe(false)
    expect(result.config).toEqual({ game: 'routes', drop: 'drop2', setId: 'D2S2', difficulty: 'medium', routeMode: 'minor', stretch: 'both' })
    expect(result.progress).toEqual({
      'recognition:D2S1:easy': { attempts: 10, correct: 7 },
      'recognition:D24S1:hard': { attempts: 4, correct: 1 },
      'routes:D2S2:minor:ii-v': { attempts: 5, correct: 3 },
      'routes:D2S2:minor:v-i': { attempts: 2, correct: 2 },
    })
  })

  it('lo migrado se guarda en el formato actual y vuelve a leerse sin migrar', () => {
    const migrated = loaded(parse(text))
    const again = loaded(parse(serialize(migrated.config, migrated.progress)))
    expect(again).toMatchObject({ migratedFrom: null, repaired: false, config: migrated.config, progress: migrated.progress })
  })

  it('un contador inválido del esquema 0 se descarta y los demás se conservan', () => {
    const broken = {
      ...schema0,
      counters: { ...schema0.counters, 'recognition/D2S1/medium': [3, 5], 'recognition/D2S1/hard': 'x', 'routes/D2S9/major/ii-v': [1, 1], 'recognition/D2S2/easy': [1] },
    }
    const result = loaded(parse(broken))
    expect(result.migratedFrom).toBe(0)
    expect(result.repaired).toBe(true)
    expect(Object.keys(result.progress).sort()).toEqual([
      'recognition:D24S1:hard',
      'recognition:D2S1:easy',
      'routes:D2S2:minor:ii-v',
      'routes:D2S2:minor:v-i',
    ])
  })

  it('un documento del esquema 0 sin contadores está dañado, no se inventa', () => {
    expect(parse({ schemaVersion: 0, config: schema0.config }).status).toBe('damaged')
  })
})
