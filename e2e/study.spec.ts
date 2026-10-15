import { expect, test } from '@playwright/test'

test('abre el modo estudio y transpone un voicing sin convertirlo en pregunta', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Modo estudio' }).click()

  await expect(page).toHaveURL(/#\/study$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Modo estudio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Forma' })).toBeVisible()

  await page.getByLabel('Tonalidad').selectOption('2')
  await expect(page.getByRole('img', { name: /Dmaj7/ })).toBeVisible()
  await expect(page.getByText(/Forma desplazada 2 trastes hacia arriba/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verificar' })).toHaveCount(0)
})

test('muestra la ruta completa, la transpone con grafía funcional y explica el movimiento', async ({ page }) => {
  await page.goto('/#/study')
  await page.getByRole('button', { name: 'Rutas II-V-I' }).click()
  await page.getByLabel('Tonalidad').selectOption('11')

  await expect(page.getByRole('heading', { name: 'Ruta completa' })).toBeVisible()
  await expect(page.getByRole('img', { name: /C♯m7/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /F♯7/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /Bmaj7/ })).toBeVisible()

  const iiV = page.getByRole('region', { name: 'Movimiento II → V' })
  const vI = page.getByRole('region', { name: 'Movimiento V → I' })
  await expect(iiV).toContainText('Movimiento total:')
  await expect(iiV).toContainText('Cuerda 4')
  await expect(vI).toContainText('Cuerda 1')

  await page.getByRole('button', { name: 'Ocultar movimiento' }).click()
  await expect(iiV).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ver movimiento' })).toBeVisible()
})

test('el modo estudio cabe en móvil sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/#/study')
  await page.getByRole('button', { name: 'Rutas II-V-I' }).click()

  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }))
  expect(ancho).toBeLessThanOrEqual(visible)
})
