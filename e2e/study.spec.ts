import { expect, test } from '@playwright/test'

test('estudio conserva la séptima gris junto a la sexta en voicings y rutas, también al transponer', async ({ page }) => {
  await page.goto('/#/study')
  await page.getByRole('button', { name: '3ª inversión', exact: true }).click()

  for (const kind of ['Voicings', 'Rutas II-V-I']) {
    await page.getByRole('button', { name: kind, exact: true }).click()
    if (kind === 'Rutas II-V-I') await page.getByRole('button', { name: /^Ruta 4/ }).click()
    const card = page.locator(kind === 'Voicings' ? '.study-card svg' : '.study-route-step:last-child svg')
    for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
      await page.getByLabel('Tonalidad').selectOption(String(tonicPc))
      await expect(card.locator('.card-reference-dot')).toHaveCount(1)
      await expect(card.locator('.card-dot:not(.card-reference-dot)')).toHaveCount(4)
      await expect(card).toHaveAttribute('aria-label', /Referencia en gris: cuerda 4, traste \d+, grado 7\./)
      const reference = await card.evaluate((svg) => {
        const ghost = svg.querySelector('.card-reference-dot')!
        const sixth = [...svg.querySelectorAll('.card-dot:not(.card-reference-dot)')].find((dot) => dot.parentElement!.querySelector('text')?.textContent === '6')!
        const x = (el: Element) => Number(el.getAttribute('cx'))
        return {
          distance: x(ghost) - x(sixth),
          sameString: ghost.getAttribute('cy') === sixth.getAttribute('cy'),
          ghostLabel: ghost.parentElement!.querySelector('text')?.textContent,
          ghostColor: getComputedStyle(ghost).fill,
          sixthColor: getComputedStyle(sixth).fill,
        }
      })
      expect(reference).toEqual({ distance: 88, sameString: true, ghostLabel: '7', ghostColor: 'rgb(223, 225, 234)', sixthColor: 'rgb(237, 188, 7)' })
      if (tonicPc === 0) await card.screenshot({ path: test.info().outputPath(kind === 'Voicings' ? 'c6-estudio.png' : 'c6-ruta.png') })
    }
  }
})

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
