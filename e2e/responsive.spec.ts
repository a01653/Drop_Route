import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

const box = async (locator: Locator) => {
  const value = await locator.boundingBox()
  expect(value).not.toBeNull()
  return value!
}

test('el menú aprovecha el ancho de escritorio con configuración y progreso en columnas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const menu = await box(page.locator('main.menu'))
  const form = await box(page.locator('.menu-formulario'))
  const progress = await box(page.locator('.menu > .progreso'))

  expect(menu.width).toBeGreaterThan(1100)
  expect(progress.x).toBeGreaterThan(form.x + form.width - 2)
  expect(Math.abs(progress.y - form.y)).toBeLessThan(4)
})

test('la pregunta usa tarjeta y respuesta en paralelo en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Empezar' }).click()

  const game = await box(page.locator('main.juego'))
  const card = await box(page.locator('.juego-tarjeta'))
  const answer = await box(page.locator('.juego-respuesta'))

  expect(game.width).toBeGreaterThan(1100)
  expect(answer.x).toBeGreaterThan(card.x + card.width - 2)
  expect(Math.abs(answer.y - card.y)).toBeLessThan(4)
})

test('el modo estudio usa controles laterales y contenido amplio en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/study')

  const workspace = await box(page.locator('.study-workspace'))
  const sidebar = await box(page.locator('.study-sidebar'))
  const content = await box(page.locator('.study-content'))

  expect(workspace.width).toBeGreaterThan(1100)
  expect(content.x).toBeGreaterThan(sidebar.x + sidebar.width - 2)
  expect(Math.abs(content.y - sidebar.y)).toBeLessThan(4)
})

test('la tercera inversión mayor del estudio muestra C6 y la transpone junto con la forma', async ({ page }) => {
  await page.goto('/#/study')
  await page.getByRole('button', { name: '3ª inversión' }).click()

  await expect(page.getByRole('img', { name: /Cmaj7 – C6/ })).toBeVisible()
  await expect(page.getByText(/Cmaj7 – C6 · 3ª inversión/)).toBeVisible()

  await page.getByLabel('Tonalidad').selectOption('2')
  await expect(page.getByRole('img', { name: /Dmaj7 – D6/ })).toBeVisible()
})

test('la ruta mayor de tercera inversión conserva la sustitución C6 de la fuente', async ({ page }) => {
  await page.goto('/#/study')
  await page.getByRole('button', { name: 'Rutas II-V-I' }).click()
  await page.getByRole('button', { name: /^Ruta 4/ }).click()

  await expect(page.getByRole('img', { name: /Cmaj7 – C6/ })).toBeVisible()
})
