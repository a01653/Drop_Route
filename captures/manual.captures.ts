import { expect, test } from '@playwright/test'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { BANK, SPOKEN, answerRecognition, answerRoute, configureRecognition, configureRoutes, expectProgress, leave, nextQuestion, startQuestion } from '../e2e/play'
import { MUSICAL_COLORS, SETS, truth } from '../e2e/support'
import { VIEWPORTS } from './figures'
import type { ViewportKind } from './figures'
import { CAPTURES_DIR, Recorder } from './recorder'
import { startPreview } from './site'
import type { Preview } from './site'

// Capturas reales para los manuales (DR-007). Se juega por la interfaz del build servido por vite preview: las preguntas
// se resuelven a partir de las posiciones visibles más data/catalog.json y data/routes.json, igual que en los E2E, sin
// semillas de prueba ni soluciones inyectadas. Una sola sesión de ordenador (1280 px) encadena los juegos para que el progreso
// sea el que esas partidas dejaron; otra sesión juega la vista general. Es un comando explícito: npm run docs:captures.

const D2S1 = SETS[0]! // Drop 2, set 1
const ROUTES = { set: D2S1, mode: 'Mayor', stretch: 'II → V' } as const

interface Session {
  context: BrowserContext
  page: Page
  /** Errores de JavaScript y de consola de la página: una captura de una página rota no sirve. */
  problems: string[]
}

async function openSession(browser: Browser, kind: ViewportKind, origin: string): Promise<Session> {
  const { width, height, deviceScaleFactor } = VIEWPORTS[kind]
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor,
    isMobile: kind === 'movil',
    hasTouch: kind === 'movil',
    locale: 'es-ES',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    // Sin service worker: lo capturado es la aplicación servida por el preview, sin cachés intermedias.
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`excepción: ${error.message}`))
  page.on('requestfailed', (request) => problems.push(`petición fallida: ${request.url()}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`consola: ${message.text()}`)
  })
  await page.goto(`${origin}/`)
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  return { context, page, problems }
}

/** La tarjeta neutra no lleva ningún color musical ni en su marcado. */
async function expectNeutral(page: Page, selector = '.juego-tarjeta') {
  const html = (await page.locator(selector).innerHTML()).toUpperCase()
  for (const color of MUSICAL_COLORS) expect(html, `color ${color} en la vista neutra`).not.toContain(color)
}

/** Tras verificar la tarjeta recupera los colores musicales de la solución. */
async function expectSolutionColors(page: Page, selector = '.juego-tarjeta') {
  const html = (await page.locator(selector).innerHTML()).toUpperCase()
  expect(MUSICAL_COLORS.some((color) => html.includes(color)), 'colores de la solución').toBe(true)
}

/** Coloca un grado del banco sobre un círculo, con los dos toques de la interfaz (ficha y destino). */
async function place(page: Page, degree: string, slot: number) {
  await page.locator(`.ficha[aria-label^="Grado ${SPOKEN[degree]}"]`).click()
  await page.locator(`[data-destino="${slot}"]`).click()
}

test.describe.serial('capturas del manual', () => {
  let site: Preview
  let recorder: Recorder
  let primary: Session
  let desktop: Session | undefined

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(420_000)
    site = await startPreview()
    recorder = new Recorder(CAPTURES_DIR, { name: 'chromium', version: browser.version() })
    await recorder.prepare()
    primary = await openSession(browser, 'escritorio', site.origin)
  })

  // Pase lo que pase, se cierran los contextos, el preview (proceso) y el directorio temporal del build.
  test.afterAll(async () => {
    await primary?.context.close()
    await desktop?.context.close()
    await site?.close()
  })

  test.afterEach(() => {
    expect(primary.problems, 'consola de la sesión principal').toEqual([])
    expect(desktop?.problems ?? [], 'consola de la sesión de ordenador').toEqual([])
  })

  test('menús de reconocimiento y de rutas a 1280 px', async () => {
    const { page } = primary
    await expect(page.getByRole('button', { name: 'Reconocer voicings', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Fácil', exact: true })).toBeVisible()
    await expect(page.locator('.progreso')).toContainText('Todavía no has verificado ninguna pregunta')
    await recorder.shoot(page, 'menu-reconocimiento-1280', { from: 'main.menu > header', to: '.menu-formulario .boton-principal' })

    await page.getByRole('button', { name: 'Rutas II-V-I', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Rutas II-V-I', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Fácil', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Mayor/ })).toBeVisible()
    await recorder.shoot(page, 'menu-rutas-1280', { from: 'main.menu > header', to: '.menu-formulario .boton-principal' })
  })

  test('fácil: pregunta neutra y error corregido', async () => {
    const { page } = primary
    await configureRecognition(page, D2S1, 'Fácil')
    await startQuestion(page)
    await expect(page.locator('.opciones-acorde button')).toHaveCount(4)
    await expect(page.locator('.opciones-acorde button[aria-pressed="true"]')).toHaveCount(0)
    await expectNeutral(page)
    await recorder.shoot(page, 'facil-pregunta-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .juego-respuesta' })

    await answerRecognition(page, D2S1, 'Fácil', 'acorde-incorrecto')
    await expect(page.locator('.opciones-acorde button.ko')).toHaveCount(1)
    await expect(page.locator('.opciones-acorde button.ok')).toHaveCount(1)
    await expect(page.locator('.opciones-acorde button.ko')).toHaveAttribute('aria-pressed', 'true')
    await expectSolutionColors(page)
    await recorder.shoot(page, 'facil-correccion-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .resultado' })

    // Una segunda pregunta acertada, para que el progreso tenga las dos cosas.
    await nextQuestion(page, 2)
    await answerRecognition(page, D2S1, 'Fácil', 'completo')
    await leave(page)
  })

  test('medio: dos desplegables y acierto parcial', async () => {
    const { page } = primary
    await configureRecognition(page, D2S1, 'Medio')
    await startQuestion(page)
    await expect(page.getByRole('combobox', { name: 'Acorde', exact: true })).toHaveValue('')
    await expect(page.getByRole('combobox', { name: 'Inversión', exact: true })).toHaveValue('')
    await expectNeutral(page)
    await recorder.shoot(page, 'medio-pregunta-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .juego-respuesta' })

    await answerRecognition(page, D2S1, 'Medio', 'inversion-incorrecta')
    await expect(page.getByRole('heading', { name: 'Acierto parcial' })).toBeVisible()
    await expect(page.locator('.correccion li.ok')).toHaveCount(1)
    await expect(page.locator('.correccion li.ko')).toHaveCount(1)
    await expectSolutionColors(page)
    await recorder.shoot(page, 'medio-correccion-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .resultado' })
    await leave(page)
  })

  test('difícil: colocación antes de verificar y su corrección', async () => {
    const { page } = primary
    await configureRecognition(page, D2S1, 'Difícil')
    await startQuestion(page)
    const voicing = await truth(page, D2S1.id)
    const degrees = voicing.notes.map((note) => note.degree!)
    await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption(voicing.quality)
    await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption(String(voicing.inversion))
    await place(page, degrees[0]!, 0)
    await place(page, degrees[1]!, 1)
    await expect(page.locator('.destino.ocupado')).toHaveCount(2)
    await expect(page.locator('.ficha')).toHaveCount(BANK.length)
    await expect(page.locator('.ficha.colocada')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
    await expectNeutral(page)
    await recorder.shoot(page, 'dificil-pregunta-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .juego-respuesta' })

    // Un único círculo equivocado: el resto, correcto.
    const spare = BANK.find((degree) => !degrees.includes(degree))!
    await place(page, spare, 2)
    await place(page, degrees[3]!, 3)
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByRole('heading', { name: 'Acierto parcial' })).toBeVisible()
    await expect(page.locator('.correccion li.ok')).toHaveCount(5)
    await expect(page.locator('.correccion li.ko')).toHaveCount(1)
    await expectSolutionColors(page)
    await recorder.shoot(page, 'dificil-correccion-1280', { from: '.juego-cabecera', to: '.juego-tarjeta, .resultado' })
    await leave(page)
  })

  test('rutas: pregunta, fallo con Solución y con Tu respuesta', async () => {
    const { page } = primary
    await configureRoutes(page, ROUTES)
    await startQuestion(page)
    await expect(page.locator('.partida svg')).toHaveCount(1)
    await expect(page.locator('.candidata svg')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^Candidata \d$/ })).toHaveCount(4)
    await expectNeutral(page, '.candidata-tarjeta')
    await recorder.shoot(page, 'ruta-pregunta-1280', { from: '.juego-cabecera', to: '.candidata' })

    await answerRoute(page, { setId: D2S1.id, mode: 'major', from: 'II', correct: false })
    await expect(page.locator('.selector button.ko')).toHaveCount(1)
    await expect(page.locator('.selector button.ok')).toHaveCount(1)
    for (let index = 0; index < 4; index += 1) await expect(page.getByRole('button', { name: `Candidata ${index + 1}`, exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Solución', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expectSolutionColors(page, '.comparacion')
    await recorder.shoot(page, 'ruta-fallo-solucion-1280', { from: '.juego-cabecera', to: '.comparacion' })

    await page.getByRole('button', { name: 'Tu respuesta', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Tu respuesta', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.comparacion .juego-pie')).toContainText('Tu respuesta: candidata')
    await recorder.shoot(page, 'ruta-fallo-tu-respuesta-1280', { from: '.juego-cabecera', to: '.comparacion' })

    // Una segunda pregunta acertada, para que el progreso de rutas tenga las dos cosas.
    await nextQuestion(page, 2)
    await answerRoute(page, { setId: D2S1.id, mode: 'major', from: 'II', correct: true })
    await leave(page)
  })

  test('progreso con el detalle de ambos juegos', async () => {
    const { page } = primary
    // Lo visible y lo guardado coinciden con lo jugado en las pruebas anteriores, ni más ni menos.
    await expectProgress(page, {
      'recognition:D2S1:easy': [1, 2],
      'recognition:D2S1:medium': [0, 1],
      'recognition:D2S1:hard': [0, 1],
      'routes:D2S1:major:ii-v': [1, 2],
    })
    await page.locator('.progreso summary').click()
    await expect(page.locator('.progreso details')).toHaveAttribute('open', '')
    await expect(page.locator('.progreso details li')).toHaveCount(4)
    await recorder.shoot(page, 'progreso-detalle-1280', { from: '.progreso', to: '.progreso' })
  })

  test('vista general en ordenador a 1280 px', async ({ browser }) => {
    desktop = await openSession(browser, 'escritorio', site.origin)
    const { page } = desktop
    await configureRecognition(page, D2S1, 'Fácil')
    await startQuestion(page)
    await answerRecognition(page, D2S1, 'Fácil', 'completo')
    await leave(page)
    await configureRoutes(page, ROUTES)
    await startQuestion(page)
    await answerRoute(page, { setId: D2S1.id, mode: 'major', from: 'II', correct: true })
    await leave(page)
    await page.getByRole('button', { name: 'Reconocer voicings', exact: true }).click()
    await expectProgress(page, { 'recognition:D2S1:easy': [1, 1], 'routes:D2S1:major:ii-v': [1, 1] })
    await recorder.shoot(page, 'escritorio-menu-1280', 'viewport')
  })

  test('manifiesto con todas las figuras del contrato', async () => {
    await recorder.finish()
  })
})
