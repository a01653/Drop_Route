import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { answerRecognition, answerRoute, configureRecognition, configureRoutes, expectProgress, leave, startQuestion } from './play'
import type { Expected } from './play'
import { FIRST, SETS } from './support'

// Modo sin conexión REAL de Chromium contra el build que sirve vite preview: sin interceptar ni simular respuestas.
// Se espera a que el service worker se instale y tome el control con todos los recursos en su caché, se corta la red
// del contexto con setOffline(true) y se recarga. Lo que llegue hasta la página tiene que salir del service worker.
// La comprobación de actualizaciones de sw.js sí puede fallar sin conexión: no es un recurso necesario para jugar.

const D2S1 = SETS[0]!

/** Rutas de la lista de recursos precacheados que el build escribió en sw.js, relativas al ámbito. */
async function precacheList(page: Page): Promise<string[]> {
  const worker = await (await page.request.get('/sw.js')).text()
  const match = /const PRECACHE = (\[[^\]]*\])/.exec(worker)
  expect(match, 'sw.js del build lleva la lista de recursos').not.toBeNull()
  const urls = JSON.parse(match![1]!) as string[]
  expect(urls).toContain('./')
  expect(urls).toContain('index.html')
  return urls
}

/** Primera carga completa: el worker está activo, controla la página y su caché guarda todos los recursos. */
async function installed(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { message: 'el worker controla la página' }).toBe(true)
  const urls = await precacheList(page)
  const origin = new URL(page.url()).origin
  const expected = urls.map((path) => new URL(path, `${origin}/`).href).sort()
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const names = (await caches.keys()).filter((name) => name.startsWith('drop-route-precache:'))
          if (names.length !== 1) return names
          const cache = await caches.open(names[0]!)
          return (await cache.keys()).map((request) => request.url).sort()
        }),
      { message: 'la caché contiene todos los recursos del build', timeout: 15_000 },
    )
    .toEqual(expected)
  return { urls, origin }
}

/** Lo que pasa por la red del contexto una vez cortada: qué se pidió, qué falló y qué respondió el worker. */
function watchNetwork(context: BrowserContext) {
  const requested: string[] = []
  const failed: { url: string; error: string }[] = []
  const answered: { url: string; type: string; fromWorker: boolean }[] = []
  context.on('request', (request) => requested.push(request.url()))
  context.on('requestfailed', (request) => failed.push({ url: request.url(), error: request.failure()?.errorText ?? '' }))
  context.on('response', (response) => answered.push({ url: response.url(), type: response.request().resourceType(), fromWorker: response.fromServiceWorker() }))
  return { requested, failed, answered }
}

const isWorkerScript = (url: string) => new URL(url).pathname.endsWith('/sw.js')

/** Con la red cortada, todo lo necesario para jugar salió del worker; solo la actualización de sw.js pudo fallar. */
function expectServedByWorker(network: ReturnType<typeof watchNetwork>, origin: string) {
  const web = network.requested.filter((url) => /^https?:/.test(url))
  expect(web.filter((url) => new URL(url).origin !== origin), 'nada se pide fuera del origen de la aplicación').toEqual([])
  // Una petición que el propio navegador aborta al recargar la página no es un fallo de red.
  const lost = network.failed.filter((item) => !isWorkerScript(item.url) && !item.error.includes('ERR_ABORTED'))
  expect(lost.map((item) => `${item.url} ${item.error}`), 'ningún recurso del juego falla sin conexión').toEqual([])
  const needed = network.answered.filter((item) => !isWorkerScript(item.url) && item.url.startsWith(origin))
  expect(needed.length, 'hubo respuestas de recursos propios').toBeGreaterThan(0)
  expect(needed.filter((item) => !item.fromWorker).map((item) => `${item.type} ${item.url}`), 'todo recurso propio lo sirve el service worker').toEqual([])
  const types = [...new Set(needed.map((item) => item.type))]
  for (const type of ['document', 'script', 'stylesheet']) expect(types, `se sirvió algún ${type} desde el worker`).toContain(type)
}

/** Las dos fuentes manuscritas de las tarjetas salen de la caché: se cargan y no queda ninguna con error. */
async function expectOwnFonts(page: Page) {
  const fonts = await page.evaluate(async () => {
    const loaded = await Promise.all(['Gochi Hand', 'Caveat Brush'].map((family) => document.fonts.load(`16px "${family}"`)))
    await document.fonts.ready
    const faces: { family: string; status: string }[] = []
    document.fonts.forEach((face) => faces.push({ family: face.family.replace(/["']/g, ''), status: face.status }))
    return { loaded: loaded.map((list) => list.length), faces }
  })
  expect(fonts.loaded.map((count) => count > 0), 'cada fuente propia se carga').toEqual([true, true])
  expect(fonts.faces.filter((face) => face.status === 'error')).toEqual([])
  for (const family of ['Gochi Hand', 'Caveat Brush']) expect(fonts.faces.find((face) => face.family === family)?.status, family).toBe('loaded')
}

test('la primera carga instala el service worker con todos los recursos del build y sw.js es del build recién generado', async ({ page, request }) => {
  const inicio = Number(process.env.DROP_ROUTE_E2E_STARTED_AT)
  expect(Number.isFinite(inicio), 'falta DROP_ROUTE_E2E_STARTED_AT: usa playwright.config.ts').toBe(true)
  // Los sistemas de ficheros con marcas de 2 s (FAT) pueden redondear hacia abajo.
  expect(statSync(resolve('dist/sw.js')).mtimeMs, 'dist/sw.js es anterior a esta ejecución: build desactualizado').toBeGreaterThanOrEqual(inicio - 2000)
  expect(await (await request.get('/sw.js')).text(), 'el preview sirve el sw.js de dist/').toBe(readFileSync(resolve('dist/sw.js'), 'utf8'))

  const { urls } = await installed(page)
  // Solo recursos propios del build: ni PDF ni referencias, y los iconos, el manifest y las fuentes están.
  expect(urls.filter((path) => /\.pdf$|^references\//i.test(path))).toEqual([])
  expect(urls.some((path) => path.endsWith('.woff2'))).toBe(true)
  expect(urls).toContain('manifest.webmanifest')
  expect(urls.some((path) => path.endsWith('.png'))).toBe(true)
})

test('sin conexión: se recarga, se juega reconocimiento difícil y rutas, se verifica y el progreso sigue ahí tras otra recarga', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { urls, origin } = await installed(page)

  await context.setOffline(true)
  const network = watchNetwork(context)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null), 'la página recargada sin red la controla el worker').toBe(true)
  await expect(page.locator('.avisos'), 'estar sin conexión no es un aviso').toHaveCount(0)
  await expectProgress(page, {})

  // Todos los recursos del build se pueden pedir desde la página sin red, también la raíz.
  const unavailable = await page.evaluate(async (paths) => {
    const missing: string[] = []
    for (const path of paths) {
      try {
        const response = await fetch(new URL(path, document.baseURI))
        if (!response.ok) missing.push(`${path} ${response.status}`)
      } catch {
        missing.push(`${path} sin respuesta`)
      }
    }
    return missing
  }, urls)
  expect(unavailable).toEqual([])

  // Reconocimiento difícil con la tarjeta y la solución con sus colores y su fuente.
  await configureRecognition(page, FIRST, 'Difícil')
  await startQuestion(page)
  await expect(page.locator('.juego-tarjeta svg')).toBeVisible()
  await answerRecognition(page, FIRST, 'Difícil', 'completo')
  await expect(page.locator('.juego-tarjeta .card-name')).toBeVisible()
  await expect(page.locator('.juego-tarjeta .card-dot-label')).toHaveCount(4)
  await expectOwnFonts(page)
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:hard': [1, 1] })

  // Rutas, con el acierto y con un fallo que enseña los dos diagramas.
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'II → V' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: true })
  await leave(page)
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: false })
  await expect(page.locator('main svg')).toHaveCount(2)
  await leave(page)
  const played: Expected = { 'recognition:D24S1:hard': [1, 1], 'routes:D2S1:major:ii-v': [1, 2] }
  await expectProgress(page, played)

  // Comprobar si hay versión nueva falla sin red y no estorba: no hay aviso ni cambia el worker que controla.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update().catch(() => undefined)
  })
  await expect(page.locator('.avisos')).toHaveCount(0)

  // Otra recarga sin red: el progreso guardado vuelve y se sigue jugando y sumando.
  await page.reload()
  await expectProgress(page, played)
  await configureRecognition(page, FIRST, 'Medio')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Medio', 'inversion-incorrecta')
  await leave(page)
  const after: Expected = { ...played, 'recognition:D24S1:medium': [0, 1] }
  await expectProgress(page, after)
  await page.reload()
  await expectProgress(page, after)
  await expect(page.locator('.avisos')).toHaveCount(0)

  expectServedByWorker(network, origin)
  expect(errors).toEqual([])
})

test('sin conexión: las tarjetas, las fuentes, el manifest y los iconos de la pantalla de revisión salen del service worker', async ({ page, context }) => {
  const { urls, origin } = await installed(page)
  await context.setOffline(true)
  const network = watchNetwork(context)

  await page.goto('/#/revision')
  await page.reload()
  await expect(page.locator('svg.fretboard-card').first()).toBeVisible()
  expect(await page.locator('svg.fretboard-card').count()).toBeGreaterThan(1)
  await expectOwnFonts(page)

  // El manifest y cada icono declarado en la página o en el manifest se piden sin red y responden.
  const icons = await page.evaluate(async () => {
    const hrefs = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="manifest"], link[rel="apple-touch-icon"]')].map((link) => link.href)
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (manifestLink) {
      const manifest = (await (await fetch(manifestLink.href)).json()) as { icons?: { src: string }[] }
      for (const icon of manifest.icons ?? []) hrefs.push(new URL(icon.src, manifestLink.href).href)
    }
    const results: { href: string; status: number; type: string | null }[] = []
    for (const href of hrefs) {
      const response = await fetch(href)
      results.push({ href, status: response.status, type: response.headers.get('content-type') })
    }
    return results
  })
  expect(icons.length, 'la página declara manifest e iconos').toBeGreaterThanOrEqual(3)
  expect(icons.filter((icon) => icon.status !== 200)).toEqual([])
  // Todo lo anterior está entre los recursos precacheados del build.
  const precached = new Set(urls.map((path) => new URL(path, `${origin}/`).href))
  expect(icons.filter((icon) => !precached.has(icon.href)).map((icon) => icon.href)).toEqual([])

  expectServedByWorker(network, origin)
})
