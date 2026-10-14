import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import { createAppStore } from '../progress'
import type { AppStore, NoticeKind } from '../progress'
import { createMemoryStorage } from '../progress/memory-storage'
import { defaultConfig, voicingOf } from '../session'
import type { QuestionState } from '../session'
import { App } from './App'
import { ProgressPanel } from './game/ProgressPanel'
import { Notices } from './Notices'
import { createUpdateController } from './pwa/update'

const noop = () => undefined
const config = defaultConfig(catalog)
const PROGRESS = {
  'recognition:D2S1:easy': { attempts: 10, correct: 7 },
  'recognition:D24S1:hard': { attempts: 4, correct: 1 },
  'routes:D2S2:minor:ii-v': { attempts: 5, correct: 3 },
  'routes:D2S2:minor:v-i': { attempts: 2, correct: 2 },
}

describe('resumen de progreso en el menú', () => {
  it('sin intentos lo dice y no enseña cifras inventadas', () => {
    const html = renderToStaticMarkup(<ProgressPanel progress={{}} config={config} />)
    expect(html).toContain('Tu progreso')
    expect(html).toContain('Todavía no has verificado ninguna pregunta')
    expect(html).not.toMatch(/\d+ de \d+/)
  })

  it('con intentos enseña las cifras reales por juego, lo de la selección y el detalle', () => {
    const html = renderToStaticMarkup(<ProgressPanel progress={PROGRESS} config={config} />)
    expect(html).toContain('<dt>Reconocer voicings</dt><dd>8 de 14 (57 %)</dd>')
    expect(html).toContain('<dt>Rutas II-V-I</dt><dd>5 de 7 (71 %)</dd>')
    // Lo elegido en el menú: Drop 2, set 1, fácil.
    expect(html).toContain('<span>Drop 2 · set 1 · Fácil</span><strong>7 de 10 (70 %)</strong>')
    // El detalle lista todo lo que tiene intentos.
    expect(html).toContain('<span>Drop 2+4 · set 1 · Difícil</span><strong>1 de 4 (25 %)</strong>')
    expect(html).toContain('<span>Drop 2 · set 2 · Menor · II → V</span><strong>3 de 5 (60 %)</strong>')
    expect(html).toContain('<span>Drop 2 · set 2 · Menor · V → I</span><strong>2 de 2 (100 %)</strong>')
  })

  it('con rutas II → V → I elegidas muestra los dos tramos por separado', () => {
    const html = renderToStaticMarkup(
      <ProgressPanel progress={PROGRESS} config={{ ...config, game: 'routes', setId: 'D2S2', routeMode: 'minor', stretch: 'both' }} />,
    )
    const chosen = /<h3>Con lo que has elegido<\/h3>([^]*?)<\/ul>/.exec(html)![1]!
    expect(chosen).toContain('<span>Drop 2 · set 2 · Menor · II → V</span><strong>3 de 5 (60 %)</strong>')
    expect(chosen).toContain('<span>Drop 2 · set 2 · Menor · V → I</span><strong>2 de 2 (100 %)</strong>')
  })

  it('no habla de puntos, clasificaciones ni rachas', () => {
    const html = renderToStaticMarkup(<ProgressPanel progress={PROGRESS} config={config} />)
    expect(html).not.toMatch(/puntos|ranking|clasificaci|racha|récord/i)
  })
})

describe('avisos', () => {
  const render = (storage: NoticeKind | null, update = false, unsaved = false) =>
    renderToStaticMarkup(<Notices storage={storage} onDismiss={noop} update={update} onUpdate={noop} unsaved={unsaved} />)

  it('sin avisos no pinta nada', () => {
    expect(render(null)).toBe('')
  })

  it('cada aviso del almacenamiento tiene su texto y solo los informativos se pueden cerrar', () => {
    const kinds: NoticeKind[] = ['unavailable', 'write-failed', 'damaged', 'damaged-uncopied', 'repaired', 'repaired-uncopied', 'migration-uncopied', 'future']
    const titles = new Set<string>()
    for (const kind of kinds) {
      const html = render(kind)
      expect(html, kind).toContain('role="status"')
      titles.add(/<h2>([^<]*)<\/h2>/.exec(html)![1]!)
      const closable = kind === 'damaged' || kind === 'repaired'
      expect(html.includes('Entendido'), kind).toBe(closable)
    }
    expect(titles.size).toBeGreaterThanOrEqual(6)
  })

  it('solo promete una copia cuando existe', () => {
    for (const kind of ['damaged', 'repaired'] as const) expect(render(kind)).toMatch(/Se ha guardado una copia/)
    for (const kind of ['damaged-uncopied', 'repaired-uncopied', 'migration-uncopied'] as const) {
      const html = render(kind)
      expect(html, kind).not.toMatch(/Se ha guardado una copia del/)
      expect(html, kind).toMatch(/no se (ha podido|guardará)/i)
    }
    expect(render('future')).toContain('sin tocar')
    expect(render('write-failed')).toContain('se perderá')
    expect(render('unavailable')).toContain('solo duran mientras la página siga abierta')
  })

  it('la actualización se ofrece con un botón y explica que el progreso se conserva', () => {
    const html = render(null, true)
    expect(html).toContain('Hay una versión nueva de Drop Route')
    expect(html).toContain('Actualizar ahora')
    expect(html).toContain('tu progreso y tu configuración se conservan')
    expect(html).not.toContain('se perderá')
  })

  it('si lo que hay en la página no está guardado, la actualización no promete conservarlo y lo dice con texto explícito', () => {
    const html = render('write-failed', true, true)
    expect(html).toContain('Hay una versión nueva de Drop Route')
    expect(html).not.toContain('se conservan')
    expect(html).toContain('no está guardado en el dispositivo')
    expect(html).toContain('se perderá')
    expect(html).toContain('Puedes seguir jugando sin actualizar')
    expect(html).toContain('Actualizar y perder lo no guardado')
    expect(html).not.toContain('Actualizar ahora')
    // Sin modal: es el mismo aviso en línea, con un único botón.
    expect(html).not.toMatch(/role="(alert)?dialog"|aria-modal/)
    expect(html.match(/<button/g)).toHaveLength(1)
  })
})

describe('actualización y almacenamiento', () => {
  const pwa = createUpdateController()
  pwa.announce(noop)
  const menuHtml = (storage: Parameters<typeof createAppStore>[0]) => renderToStaticMarkup(<App store={createAppStore(storage)} pwa={pwa} />)

  it('con almacenamiento sin problemas promete conservar los datos', () => {
    const html = menuHtml({ storage: createMemoryStorage() })
    expect(html).toContain('Actualizar ahora')
    expect(html).toContain('se conservan')
  })

  it('sin almacenamiento, o con uno que no deja escribir, avisa de que se perderá lo no guardado', () => {
    const blocked = menuHtml({ storage: null })
    expect(blocked).toContain('Actualizar y perder lo no guardado')
    expect(blocked).not.toContain('Actualizar ahora')
    const storage = createMemoryStorage()
    const store = createAppStore({ storage })
    storage.failSet = () => true
    store.dispatch({ type: 'configure', change: { difficulty: 'medium' } })
    expect(store.getSnapshot().notice).toBe('write-failed')
    expect(renderToStaticMarkup(<App store={store} pwa={pwa} />)).toContain('Actualizar y perder lo no guardado')
  })

  it('con datos de una versión futura o sin copia posible también avisa, y no hay promesa de conservar', () => {
    const future = createMemoryStorage({ 'drop-route:state': JSON.stringify({ schemaVersion: 99 }) })
    expect(menuHtml({ storage: future })).toContain('Actualizar y perder lo no guardado')
    const uncopied = createMemoryStorage({ 'drop-route:state': '{no es json' })
    uncopied.failSet = () => true
    const html = menuHtml({ storage: uncopied })
    expect(html).toContain('Actualizar y perder lo no guardado')
    expect(html).not.toContain('se conservan')
  })

  it('datos dañados o reparados con copia guardada: ya está todo guardado y se conserva', () => {
    const damaged = createMemoryStorage({ 'drop-route:state': '{no es json' })
    expect(menuHtml({ storage: damaged })).toContain('Actualizar ahora')
  })
})

describe('la aplicación con el almacén', () => {
  const play = (store: AppStore) => {
    store.dispatch({ type: 'start', seed: 3 })
    const session = store.getSnapshot().session as QuestionState
    store.dispatch({ type: 'choose', change: { quality: voicingOf(catalog, session.question).quality } })
    store.dispatch({ type: 'verify' })
  }

  it('el menú enseña el progreso guardado y el aviso de almacenamiento bloqueado', () => {
    const storage = createMemoryStorage()
    const store = createAppStore({ storage })
    play(store)
    store.dispatch({ type: 'exit' })
    const html = renderToStaticMarkup(<App store={store} />)
    expect(html).toContain('<dt>Reconocer voicings</dt><dd>1 de 1 (100 %)</dd>')

    const blocked = renderToStaticMarkup(<App store={createAppStore({ storage: null })} />)
    expect(blocked).toContain('Este navegador no deja guardar datos')
  })

  it('el aviso de almacenamiento sigue visible durante una partida', () => {
    const store = createAppStore({ storage: null })
    store.dispatch({ type: 'start', seed: 2 })
    const html = renderToStaticMarkup(<App store={store} />)
    expect(html).toContain('<main class="juego"')
    expect(html).toContain('Este navegador no deja guardar datos')
  })

  it('la actualización solo se ofrece en el menú, nunca con una pregunta abierta', () => {
    const pwa = createUpdateController()
    pwa.announce(noop)
    const store = createAppStore()
    expect(renderToStaticMarkup(<App store={store} pwa={pwa} />)).toContain('Actualizar ahora')
    store.dispatch({ type: 'start', seed: 2 })
    expect(renderToStaticMarkup(<App store={store} pwa={pwa} />)).not.toContain('Actualizar ahora')
    store.dispatch({ type: 'exit' })
    expect(renderToStaticMarkup(<App store={store} pwa={pwa} />)).toContain('Actualizar ahora')
  })

  it('sin versión nueva no hay aviso de actualización', () => {
    expect(renderToStaticMarkup(<App store={createAppStore()} pwa={createUpdateController()} />)).not.toContain('Actualizar ahora')
  })
})

describe('controlador de actualizaciones', () => {
  it('avisa una sola vez a quien observa y apply activa la versión anunciada', () => {
    const pwa = createUpdateController()
    let calls = 0
    let applied = 0
    const unsubscribe = pwa.subscribe(() => {
      calls += 1
    })
    expect(pwa.getSnapshot()).toBe(false)
    pwa.apply()
    expect(applied).toBe(0)
    pwa.announce(() => {
      applied += 1
    })
    pwa.announce(() => {
      applied += 1
    })
    expect(pwa.getSnapshot()).toBe(true)
    expect(calls).toBe(1)
    pwa.apply()
    expect(applied).toBe(1)
    unsubscribe()
  })
})
