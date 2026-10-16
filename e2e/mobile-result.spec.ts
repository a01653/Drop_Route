import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { answerRecognition, answerRoute, configureRoutes, startQuestion } from './play'
import { SETS, begin } from './support'

async function expectResultInViewport(page: Page) {
  await expect(page.locator('#resultado-titulo')).toBeFocused()
  // toBeVisible permite elementos fuera de pantalla. Medimos antes de tocar
  // Siguiente, porque click() lo desplazaría y ocultaría este fallo.
  await expect.poll(() => page.locator('.resultado').evaluate((result) => {
    const viewport = window.visualViewport
    const top = viewport?.offsetTop ?? 0
    const bottom = top + (viewport?.height ?? innerHeight)
    const bounds = result.getBoundingClientRect()
    return Math.min(bounds.top - top, bottom - bounds.bottom)
  }), { message: 'El resultado y Siguiente deben aparecer completos con margen inferior' }).toBeGreaterThanOrEqual(15)
}

for (const viewport of [{ width: 400, height: 776 }, { width: 360, height: 640 }]) {
  for (const answer of ['completo', 'acorde-incorrecto'] as const) {
    test(`móvil ${viewport.width}×${viewport.height}: ${answer}, resultado y Siguiente sin recorte`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await begin(page, SETS[0]!, 'Fácil')
      await answerRecognition(page, SETS[0]!, 'Fácil', answer)
      await expectResultInViewport(page)
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Pregunta 2', exact: true })).toBeFocused()
      await expect(page.getByRole('heading', { name: 'Pregunta 2', exact: true })).toBeInViewport({ ratio: 1 })
    })
  }
}

test('medio: muestra la corrección de ambos campos y Siguiente a 390×700', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await begin(page, SETS[0]!, 'Medio')
  await answerRecognition(page, SETS[0]!, 'Medio', 'inversion-incorrecta')
  await expectResultInViewport(page)
})

test('difícil: una corrección más alta que la pantalla empieza por el título y permite llegar a Siguiente', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 480 })
  await begin(page, SETS[0]!, 'Difícil')
  await page.addStyleTag({ content: ':root { font-size: 20px; }' })
  await answerRecognition(page, SETS[0]!, 'Difícil', 'grado-incorrecto')
  await expect(page.locator('#resultado-titulo')).toBeFocused()
  expect((await page.locator('.resultado').boundingBox())!.height).toBeGreaterThan(480)
  await expect.poll(() => page.locator('.resultado').evaluate((result) => result.getBoundingClientRect().top)).toBeGreaterThanOrEqual(15)
  await expect.poll(() => page.locator('.resultado').evaluate((result) => result.getBoundingClientRect().top)).toBeLessThan(25)
  // Una corrección larga se lee desplazándose; no se recorta ni se fuerza a
  // caber reduciendo la letra. El botón conserva espacio al final de la página.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeInViewport({ ratio: 1 })
  const bottom = await page.getByRole('button', { name: 'Siguiente', exact: true }).evaluate((button) => button.getBoundingClientRect().bottom)
  expect(bottom).toBeLessThanOrEqual(480 - 15)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

for (const correct of [true, false]) {
  test(`rutas: ${correct ? 'acierto' : 'otra candidata'}, resultado completo a 390×700`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/')
    await configureRoutes(page, { set: SETS[0]!, mode: 'Mayor', stretch: 'II → V' })
    await startQuestion(page)
    await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct })
    await expectResultInViewport(page)
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Pregunta 2', exact: true })).toBeFocused()
  })
}

test('escritorio: si el resultado cabe, no desplaza la página al verificar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await begin(page, SETS[0]!, 'Fácil')
  const before = await page.evaluate(() => window.scrollY)
  await answerRecognition(page, SETS[0]!, 'Fácil', 'completo')
  await expectResultInViewport(page)
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
})
