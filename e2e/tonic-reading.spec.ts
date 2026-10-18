import { expect, test } from '@playwright/test'
import { SETS, begin } from './support'

test('C6: tónica explícita, corrección por C y lectura equivalente sin pistas previas', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 9 / 4294967296 })
  await begin(page, SETS[0]!, 'Medio')
  await expect(page.locator('.juego-tonica strong')).toHaveText('Tónica: C')
  await expect(page.locator('.lectura-tonica')).toHaveCount(0)
  await expect(page.locator('.juego-tarjeta .card-dot-label')).toHaveCount(0)
  // Las notas A-E-G-C serían Am7 fundamental. Con C como tónica, aquí la inversión es tercera.
  await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption('maj7')
  await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption('0')
  await page.getByRole('button', { name: 'Verificar', exact: true }).click()
  await expect(page.locator('.correccion li.ko')).toContainText('Solución: 3ª inversión.')
  await expect(page.locator('.lectura-tonica')).toContainText('Con tónica C, se lee C6. La tónica está en la cuerda 1, traste 8.')
  await expect(page.locator('.lectura-tonica')).toContainText('Las mismas notas forman Am7 si tomas A como tónica. La inversión pasa a ser fundamental.')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.locator('.juego-tonica strong')).toHaveText('Tónica: C')
  await expect(page.locator('.lectura-tonica')).toHaveCount(0)
})

test('Cm7: la tercera inversión de E♭6 no sustituye la fundamental respecto a C', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 6 / 4294967296 })
  await begin(page, SETS[0]!, 'Medio')
  await expect(page.locator('.juego-tonica strong')).toHaveText('Tónica: C')
  await expect(page.locator('.lectura-tonica')).toHaveCount(0)
  await expect(page.locator('.juego-tarjeta .card-dot-label')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption('m7')
  await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption('3')
  await page.getByRole('button', { name: 'Verificar', exact: true }).click()
  await expect(page.locator('.correccion li.ko')).toContainText('Solución: Fundamental.')
  await expect(page.locator('.lectura-tonica')).toContainText('Con tónica C, se lee Cm7. La tónica está en la cuerda 4, traste 10.')
  await expect(page.locator('.lectura-tonica')).toContainText('Las mismas notas forman E♭6 si tomas E♭ como tónica. La inversión pasa a ser 3ª inversión.')
})

test('la autoría queda al pie en menú, juego y estudio sin tapar controles en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toHaveText('Creado por Jesús Quevedo Rodríguez')
  for (const screen of ['menu', 'game', 'study']) {
    if (screen === 'game') await page.getByRole('button', { name: 'Empezar', exact: true }).click()
    if (screen === 'study') await page.goto('/#/study')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()
    const layout = await footer.evaluate((element) => ({
      top: element.getBoundingClientRect().top + window.scrollY,
      mainBottom: document.querySelector('main')!.getBoundingClientRect().bottom + window.scrollY,
      width: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      fontSize: parseFloat(getComputedStyle(element).fontSize),
    }))
    expect(layout.top).toBeGreaterThanOrEqual(layout.mainBottom)
    expect(layout.width).toBeLessThanOrEqual(layout.viewport)
    expect(layout.fontSize).toBeLessThanOrEqual(12)
  }
})
