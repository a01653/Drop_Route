import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test as playwright } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import {
  STORAGE_KEY,
  answerRecognition,
  answerRoute,
  configureRecognition,
  configureRoutes,
  controlStorage,
  expectProgress,
  leave,
  nextQuestion,
  startQuestion,
  storageNotice,
  stored,
  storedCounters,
} from './play'
import type { Expected } from './play'
import { buildPair, expectedCache, startSite } from './pwa-site'
import type { Build, Label, Site } from './pwa-site'
import { FIRST, SETS } from './support'

// Actualización de la PWA en Chromium REAL, sin mocks de serviceWorker, de la caché ni de las respuestas. Dos builds
// reales de Vite (A y B) de la misma fuente se escriben fuera de dist/, cada uno con una marca de test y su sw.js
// emitido por el generador real. Un servidor HTTP propio, en un puerto libre que elige el sistema, sirve primero A y
// después B: así se ve qué build ejecuta la página, qué responde el worker que la controla y qué hay en sus cachés.
// Se ejecuta una sola vez, en escritorio (playwright.config.ts lo excluye del proyecto móvil).
//
// Modo serie: los builds se generan una vez por worker y se comparten, y los tests de un mismo fichero no se reparten
// entre workers que repetirían esos builds.
const D2S1 = SETS[0]!
const D2S2 = SETS[1]!
const OWN_PREFIX = 'drop-route-precache:'
const WAIT = { timeout: 20_000 }

const built: Record<string, Record<Label, Build>> = {}
const BASES = ['/', '/Drop_Route/']
let workDir = ''

const test = playwright.extend<{ siteBase: string; site: Site }>({
  siteBase: ['/', { option: true }],
  // El servidor se cierra siempre, también si el test falla o agota su tiempo.
  site: async ({ siteBase }, provide) => {
    const builds = built[siteBase]
    if (!builds) throw new Error(`No hay builds para la base ${siteBase}`)
    const site = await startSite(siteBase, builds)
    try {
      await provide(site)
    } finally {
      await site.close()
    }
  },
})

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  test.setTimeout(300_000)
  workDir = await mkdtemp(join(tmpdir(), 'drop-route-pwa-update-'))
  const pairs = await Promise.all(BASES.map((base, index) => buildPair(base, join(workDir, `base${index}`))))
  BASES.forEach((base, index) => {
    built[base] = pairs[index]!
  })
})

test.afterAll(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
})

// ---------------------------------------------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------------------------------------------

const heading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Drop Route' })
const updateNotice = (page: Page) => page.locator('.aviso[aria-label="Aviso de actualización"]')
const pressed = (page: Page, name: string | RegExp) =>
  expect(page.getByRole('button', { name, exact: typeof name === 'string' })).toHaveAttribute('aria-pressed', 'true')

/** Lo que cuenta de la página: cuántas veces se cargó, si salió algún diálogo y los errores de JavaScript. */
function watch(page: Page) {
  const seen = { loads: 0, dialogs: [] as string[], errors: [] as string[] }
  page.on('load', () => {
    seen.loads += 1
  })
  page.on('dialog', (dialog) => {
    seen.dialogs.push(dialog.message())
    void dialog.dismiss()
  })
  page.on('pageerror', (error) => seen.errors.push(error.message))
  return seen
}

/** Qué build ejecuta la página: su script, su documento y el recurso que contesta el worker que la controla. */
async function running(page: Page) {
  try {
    return await page.evaluate(async () => ({
      script: (globalThis as unknown as { __DROP_ROUTE_E2E_BUILD__?: string }).__DROP_ROUTE_E2E_BUILD__ ?? null,
      meta: document.querySelector('meta[name="drop-route-e2e-build"]')?.getAttribute('content') ?? null,
      marker: ((await (await fetch(new URL('build-marker.json', document.baseURI))).json()) as { build: string }).build,
      controlled: navigator.serviceWorker.controller !== null,
    }))
  } catch {
    // Con la página recargándose no hay contexto: el sondeo vuelve a intentarlo.
    return null
  }
}
const expectRunning = (page: Page, label: Label) =>
  expect.poll(() => running(page), { ...WAIT, message: `la página ejecuta el build ${label}` }).toEqual({ script: label, meta: label, marker: label, controlled: true })

/** Cada caché del origen con el SHA-256 de los bytes REALES de cada entrada, leídos del almacén del navegador. */
const cacheHashes = (page: Page) =>
  page.evaluate(async () => {
    const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const all: Record<string, Record<string, string>> = {}
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      const entries: Record<string, string> = {}
      for (const request of await cache.keys()) {
        const response = (await cache.match(request))!
        entries[request.url] = hex(await crypto.subtle.digest('SHA-256', await response.arrayBuffer()))
      }
      all[name] = entries
    }
    return all
  })

const seedCaches = (page: Page, names: string[]) =>
  page.evaluate(async (list) => {
    for (const name of list) await (await caches.open(name)).put(new URL(`entrada-${list.indexOf(name)}`, location.href), new Response(`contenido de ${name}`))
  }, names)

/** Primera visita: el worker A se instala, controla la página y su caché guarda exactamente el build A. */
async function installFirst(page: Page, site: Site, A: Build) {
  await page.goto(site.url())
  await expect(heading(page)).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope), 'el ámbito es la base de la aplicación').toBe(site.url())
  await expectRunning(page, 'A')
  await expect.poll(() => cacheHashes(page), { ...WAIT, message: 'la caché de A contiene todo el build A' }).toEqual({ [A.cache]: expectedCache(A, site.origin) })
}

/** Cambia el contenido servido y pide la comprobación al registro real: B se instala y se queda esperando. */
async function offerB(page: Page, site: Site) {
  site.serve('B')
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update()
  })
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? null), { ...WAIT, message: 'B queda en espera' })
    .toBe('installed')
}

async function expectConfig(page: Page, labels: (string | RegExp)[]) {
  for (const label of labels) await pressed(page, label)
}
const ROUTES_CONFIG = ['Rutas II-V-I', /^Set 2\b/, /^Menor\b/, /^V → I\b/]

/** Nada que no sea sw.js llegó al servidor. Los favicons los pide el proceso del navegador, no la página ni el worker. */
const onlyWorkerChecks = (site: Site, since: number) =>
  site.log
    .slice(since)
    .map((entry) => entry.path)
    .filter((path) => path !== `${site.base}sw.js` && !/\/favicon\.(svg|ico)$/.test(path))

// ---------------------------------------------------------------------------------------------------------------
// Actualización completa: raíz y subruta
// ---------------------------------------------------------------------------------------------------------------

async function updateScenario(page: Page, context: BrowserContext, site: Site) {
  const { A, B } = built[site.base]!
  const seen = watch(page)
  await installFirst(page, site, A)

  // Cachés que no son nuestras: otra aplicación, nombres parecidos y otra instalación de Drop Route en otra base. Y una
  // caché propia anterior del mismo ámbito, que sí debe desaparecer. Se crean con la API real de CacheStorage.
  const otherBase = site.base === '/' ? '/Drop_Route/' : '/'
  const foreign = [`${OWN_PREFIX}${otherBase}:ajena-0000`, `${OWN_PREFIX}/Drop_Route/otra/:ajena-0001`, 'otra-aplicacion:v1', 'drop-route-cache:v1']
  const stale = `${OWN_PREFIX}${site.base}:version-vieja`
  await seedCaches(page, [...foreign, stale])
  const seeded = await cacheHashes(page)
  expect(Object.keys(seeded).sort()).toEqual([A.cache, stale, ...foreign].sort())

  // A acumula progreso y configuración por la interfaz: reconocimiento difícil y rutas menores V → I (un acierto y un fallo).
  await configureRecognition(page, FIRST, 'Difícil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Difícil', 'completo')
  await leave(page)
  await configureRoutes(page, { set: D2S2, mode: 'Menor', stretch: 'V → I' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S2', mode: 'minor', from: 'V', correct: true })
  await nextQuestion(page, 2)
  await answerRoute(page, { setId: 'D2S2', mode: 'minor', from: 'V', correct: false })
  await leave(page)
  const played: Expected = { 'recognition:D24S1:hard': [1, 1], 'routes:D2S2:minor:v-i': [1, 2] }
  await expectProgress(page, played)
  await expect(updateNotice(page)).toHaveCount(0)

  // Pregunta abierta, y entonces aparece B: se instala y espera. La página no se recarga ni cambia de build.
  await startQuestion(page)
  await page.evaluate(() => {
    ;(window as unknown as { __e2eDocument?: string }).__e2eDocument = 'documento-de-A'
  })
  const loadsAtOffer = seen.loads
  await offerB(page, site)
  expect(seen.loads, 'B en espera no recarga la página').toBe(loadsAtOffer)
  expect(await page.evaluate(() => (window as unknown as { __e2eDocument?: string }).__e2eDocument), 'es el mismo documento').toBe('documento-de-A')
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 1' })).toBeVisible()
  // Mientras B espera, la página y el worker que la controla siguen siendo A, aunque el servidor ya sirva B: el recurso
  // pedido por la página sale de la caché de A. Las dos cachés conviven y nada se ha borrado todavía.
  expect(await running(page)).toEqual({ script: 'A', meta: 'A', marker: 'A', controlled: true })
  const waiting = await cacheHashes(page)
  expect(Object.keys(waiting).sort()).toEqual([A.cache, B.cache, stale, ...foreign].sort())
  expect(waiting[B.cache]).toEqual(expectedCache(B, site.origin))
  expect(waiting[A.cache]).toEqual(expectedCache(A, site.origin))
  await expect(updateNotice(page), 'con una pregunta abierta no se ofrece').toHaveCount(0)

  // Contestar con B en espera funciona y tampoco ofrece nada en la corrección; solo el menú lo ofrece.
  await answerRoute(page, { setId: 'D2S2', mode: 'minor', from: 'V', correct: true })
  await expect(updateNotice(page)).toHaveCount(0)
  expect(seen.loads).toBe(loadsAtOffer)
  await leave(page)
  played['routes:D2S2:minor:v-i'] = [2, 3]
  await expectProgress(page, played)
  await expect(updateNotice(page)).toBeVisible()
  await expect(updateNotice(page)).toContainText('tu progreso y tu configuración se conservan')
  const before = await stored(page, STORAGE_KEY)
  expect(before).not.toBeNull()

  // Actualizar ahora: B se activa, la página se recarga una sola vez y todo lo guardado sigue igual.
  const reloaded = page.waitForEvent('load')
  await updateNotice(page).getByRole('button', { name: 'Actualizar ahora', exact: true }).click()
  await reloaded
  await expectRunning(page, 'B')
  await expect(heading(page)).toBeVisible()
  await expect(updateNotice(page)).toHaveCount(0)
  await expectProgress(page, played)
  expect(await stored(page, STORAGE_KEY), 'el documento guardado es exactamente el mismo').toBe(before)
  await expectConfig(page, ROUTES_CONFIG)
  expect(await page.evaluate(() => (window as unknown as { __e2eDocument?: string }).__e2eDocument), 'es un documento nuevo').toBeUndefined()

  // Navegación normal con B: se sigue sumando de uno en uno sobre lo conservado, sin duplicar el contador.
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S2', mode: 'minor', from: 'V', correct: true })
  await leave(page)
  played['routes:D2S2:minor:v-i'] = [3, 4]
  await expectProgress(page, played)
  expect(seen.loads - loadsAtOffer, 'la actualización recargó una sola vez').toBe(1)

  // Cachés: solo queda la de B, con los bytes reales del build B, y las ajenas siguen intactas. La de A y la anterior
  // del mismo ámbito se han borrado.
  const final = await cacheHashes(page)
  expect(Object.keys(final).sort()).toEqual([B.cache, ...foreign].sort())
  expect(final[B.cache]).toEqual(expectedCache(B, site.origin))
  expect(final[B.cache]![site.url()], 'el HTML cacheado ya no es el de A').not.toBe(expectedCache(A, site.origin)[site.url()])
  for (const name of foreign) expect(final[name], name).toEqual(seeded[name])

  // Esa caché es la que usa el worker: tras recargar, todo recurso propio llega desde el worker y al servidor solo
  // llegan las comprobaciones de sw.js.
  const answered: { url: string; fromWorker: boolean }[] = []
  page.on('response', (response) => answered.push({ url: response.url(), fromWorker: response.fromServiceWorker() }))
  const since = site.log.length
  await page.reload()
  await expectRunning(page, 'B')
  await expectProgress(page, played)
  const own = answered.filter((item) => item.url.startsWith(site.url()) && !item.url.endsWith('/sw.js') && !/\/favicon\.(svg|ico)$/.test(item.url))
  expect(own.length, 'hubo recursos propios que comprobar').toBeGreaterThan(2)
  expect(own.filter((item) => !item.fromWorker).map((item) => item.url), 'recursos propios que no salieron del worker').toEqual([])
  expect(onlyWorkerChecks(site, since), 'peticiones al servidor además de sw.js').toEqual([])

  // Sin conexión, con B: se recarga, se juega reconocimiento y rutas y se verifica. El contexto sin red es el de
  // Chromium, no una respuesta simulada.
  await context.setOffline(true)
  const offlineSince = site.log.length
  await page.reload()
  await expectRunning(page, 'B')
  await expectProgress(page, played)
  await configureRecognition(page, FIRST, 'Medio')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Medio', 'inversion-incorrecta')
  await leave(page)
  played['recognition:D24S1:medium'] = [0, 1]
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'II → V' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: true })
  await leave(page)
  played['routes:D2S1:major:ii-v'] = [1, 1]
  await expectProgress(page, played)
  await page.reload()
  await expectRunning(page, 'B')
  await expectProgress(page, played)
  expect(onlyWorkerChecks(site, offlineSince), 'sin conexión no llegó nada al servidor').toEqual([])
  await expect(updateNotice(page)).toHaveCount(0)

  expect(seen.dialogs, 'actualizar no abre ningún diálogo').toEqual([])
  expect(seen.errors).toEqual([])
}

test.describe('raíz', () => {
  test('B espera con la pregunta abierta, se ofrece al salir al menú, se activa con una recarga y lo guardado y lo offline se conservan', async ({ page, context, site }) => {
    test.setTimeout(180_000)
    await updateScenario(page, context, site)
  })
})

test.describe('subruta /Drop_Route/', () => {
  test.use({ siteBase: '/Drop_Route/' })
  test('el mismo recorrido bajo /Drop_Route/: ámbito, cachés propias del ámbito, actualización y juego sin conexión', async ({ page, context, site }) => {
    test.setTimeout(180_000)
    await updateScenario(page, context, site)
    // Fuera de la base no hay nada ni nadie controlado: la raíz del origen no es de la aplicación.
    expect((await fetch(`${site.origin}/`)).status).toBe(404)
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Almacenamiento lleno o bloqueado: actualizar pierde lo no guardado y lo dice
// ---------------------------------------------------------------------------------------------------------------

/** Llena el almacenamiento de verdad: escribe hasta que Chromium lanza QuotaExceededError incluso con un solo carácter. */
async function fillStorage(page: Page) {
  const written = await page.evaluate(() => {
    let total = 0
    let id = 0
    for (let size = 1 << 20; size >= 1; ) {
      try {
        localStorage.setItem(`relleno-${id}`, 'x'.repeat(size))
        id += 1
        total += size
      } catch {
        size = Math.floor(size / 2)
      }
    }
    return total
  })
  expect(written, 'se escribió hasta llenar la cuota').toBeGreaterThan(1_000_000)
  const refused = await page.evaluate(() => {
    try {
      localStorage.setItem('relleno-extra', 'x'.repeat(64))
      return null
    } catch (error) {
      return (error as DOMException).name
    }
  })
  expect(refused, 'el almacenamiento está lleno de verdad').toBe('QuotaExceededError')
}

const LOSS_BUTTON = 'Actualizar y perder lo no guardado'

async function expectLossOffer(page: Page) {
  const notice = updateNotice(page)
  await expect(notice).toBeVisible()
  await expect(notice).toContainText('no está guardado en el dispositivo')
  await expect(notice).toContainText('se perderá')
  await expect(notice).not.toContainText('se conservan')
  await expect(notice.getByRole('button', { name: LOSS_BUTTON, exact: true })).toBeVisible()
  await expect(notice.getByRole('button', { name: 'Actualizar ahora' })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('almacenamiento lleno de verdad: no promete conservar lo jugado en memoria y actualizar descarta solo lo no guardado', async ({ page, site }) => {
  test.setTimeout(180_000)
  const seen = watch(page)
  const { A } = built[site.base]!
  await installFirst(page, site, A)

  await configureRecognition(page, FIRST, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  const saved: Expected = { 'recognition:D24S1:easy': [1, 1] }
  await expectProgress(page, saved)

  // La configuración de rutas se elige ANTES de llenar: su documento es más corto que el de reconocimiento, así que
  // cambiarla con la cuota llena todavía se guardaría. Queda guardada junto al contador de reconocimiento.
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'II → V' })
  await expect(storageNotice(page)).toHaveCount(0)
  const before = await stored(page, STORAGE_KEY)
  expect(before).not.toBeNull()

  // Se llena el almacenamiento y se abre una pregunta de rutas: abrirla no escribe nada. Verificar añade un contador
  // NUEVO, el documento crece y la escritura falla de verdad: se avisa de que no se guarda.
  await fillStorage(page)
  await startQuestion(page)
  await expect(storageNotice(page)).toHaveCount(0)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: true })
  await expect(storageNotice(page)).toContainText('No se ha podido guardar tu progreso')
  await leave(page)
  const inMemory: Expected = { ...saved, 'routes:D2S1:major:ii-v': [1, 1] }
  await expectProgress(page, inMemory, { persisted: false })
  expect(await stored(page, STORAGE_KEY), 'lo guardado no cambió').toBe(before)
  expect(await storedCounters(page), 'en el dispositivo solo está el contador de reconocimiento').toEqual(saved)

  // B espera y la oferta avisa de la pérdida con texto explícito; no hay diálogo ni se promete conservar nada.
  await offerB(page, site)
  await expectLossOffer(page)

  const reloaded = page.waitForEvent('load')
  await updateNotice(page).getByRole('button', { name: LOSS_BUTTON, exact: true }).click()
  await reloaded
  await expectRunning(page, 'B')
  await expect(heading(page)).toBeVisible()
  // Solo queda lo que estaba guardado: el contador de reconocimiento y la configuración de rutas guardada antes de
  // llenar; el contador de rutas jugado en memoria se perdió.
  await expectProgress(page, saved)
  expect(await stored(page, STORAGE_KEY)).toBe(before)
  await expectConfig(page, ['Rutas II-V-I', /^Set 1\b/, /^Mayor\b/, /^II → V del II al V$/])
  await expect(updateNotice(page)).toHaveCount(0)
  expect(seen.dialogs).toEqual([])
  expect(seen.errors).toEqual([])
})

test('almacenamiento bloqueado: todo lo jugado es memoria, la oferta lo dice y tras actualizar no queda nada', async ({ page, site }) => {
  test.setTimeout(180_000)
  const seen = watch(page)
  const { A } = built[site.base]!
  await controlStorage(page, { blocked: true })
  await installFirst(page, site, A)
  await expect(storageNotice(page)).toContainText('Este navegador no deja guardar datos')

  await configureRecognition(page, FIRST, 'Medio')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Medio', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:medium': [1, 1] }, { persisted: false })

  await offerB(page, site)
  await expectLossOffer(page)
  const reloaded = page.waitForEvent('load')
  await updateNotice(page).getByRole('button', { name: LOSS_BUTTON, exact: true }).click()
  await reloaded
  await expectRunning(page, 'B')
  await expect(heading(page)).toBeVisible()
  await expectProgress(page, {}, { persisted: false })
  await expect(storageNotice(page)).toContainText('Este navegador no deja guardar datos')
  await expect(updateNotice(page)).toHaveCount(0)
  expect(seen.dialogs).toEqual([])
  expect(seen.errors).toEqual([])
})
