import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

test('arranca desde el build con el nombre y el estado de desarrollo', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Drop Route')
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()

  const estado = page.getByRole('region', { name: 'Estado de desarrollo' })
  await expect(estado).toContainText('En desarrollo.')
  await expect(estado).toContainText('Ya puedes reconocer voicings')
  await expect(page.getByRole('button', { name: 'Empezar' })).toBeEnabled()
})

test('muestra los datos reales de data/ empaquetados en el build', async ({ page }) => {
  await page.goto('/')

  const estado = page.getByRole('region', { name: 'Estado de desarrollo' })
  await expect(estado.getByText('Posiciones de juego')).toBeVisible()
  await expect(estado.locator('div', { hasText: 'Posiciones de juego' }).locator('dd')).toHaveText('112')
  await expect(estado.locator('div', { hasText: 'Posiciones de referencia' }).locator('dd')).toHaveText('12')
  await expect(estado.locator('div', { hasText: 'Rutas II-V-I' }).locator('dd')).toHaveText('16')
})

test('el preview sirve el build generado en esta ejecución', async ({ request }) => {
  const inicio = Number(process.env.DROP_ROUTE_E2E_STARTED_AT)
  expect(Number.isFinite(inicio), 'falta DROP_ROUTE_E2E_STARTED_AT: usa playwright.config.ts').toBe(true)

  // Los sistemas de ficheros con marcas de 2 s (FAT) pueden redondear hacia abajo.
  const generadoEn = statSync(resolve('dist/index.html')).mtimeMs
  expect(generadoEn, 'dist/ es anterior al inicio de esta ejecución: build desactualizado').toBeGreaterThanOrEqual(
    inicio - 2000,
  )

  const servido = await (await request.get('/')).text()
  const enDisco = readFileSync(resolve('dist/index.html'), 'utf8')

  expect(servido).toBe(enDisco)
  // El HTML del build apunta a recursos empaquetados, no al código fuente del servidor de desarrollo.
  expect(servido).not.toContain('/src/main.tsx')
  expect(servido).toMatch(/\/assets\/index-[\w-]+\.js/)
})

test('carga sin errores de consola ni peticiones fallidas', async ({ page }) => {
  const problemas: string[] = []
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') problemas.push(`consola: ${mensaje.text()}`)
  })
  page.on('pageerror', (error) => problemas.push(`excepción: ${error.message}`))
  page.on('requestfailed', (peticion) => problemas.push(`petición fallida: ${peticion.url()}`))
  page.on('response', (respuesta) => {
    if (respuesta.status() >= 400) problemas.push(`${respuesta.status()}: ${respuesta.url()}`)
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(problemas).toEqual([])
})

test('cabe en 360 px sin desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }))
  expect(ancho).toBeLessThanOrEqual(visible)
})
