import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { SPOKEN, answerRecognition } from './play'
import { SETS, begin, catalog, signature, truth, visiblePositions } from './support'

async function expectSixthSolution(page: Page) {
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveText('Cmaj7 – C6')
  await expect(page.locator('.juego-tarjeta .card-reference-dot')).toHaveCount(1)
  await expect(page.locator('.juego-tarjeta .card-reference-dot')).toHaveAttribute('fill', '#DFE1EA')
  await expect(page.locator('.juego-tarjeta svg')).toHaveAttribute('aria-label', /Referencia en gris:.*grado 7\./)
  await expect(page.locator('.juego-tarjeta .card-dot-label', { hasText: /^6$/ })).toHaveCount(1)
}

test('las siete terceras inversiones mayores preguntan la sexta sin pistas y revelan la séptima gris al corregir', async ({ page }) => {
  test.setTimeout(60_000)
  // Semilla 9 selecciona la tercera inversión mayor del catálogo. No se
  // inyectan notas ni respuestas: se comprueban contra las posiciones fuente.
  await page.addInitScript(() => { Math.random = () => 9 / 4294967296 })
  for (const target of SETS) {
    await begin(page, target, 'Fácil')
    const source = catalog.voicings.find((item) => item.setId === target.id && item.quality === 'maj7' && item.inversion === 3)!
    const expected = source.notes.map((note) => note.degree === '7' ? { ...note, fret: note.fret - 2 } : note)
    expect(signature(await visiblePositions(page)), target.id).toBe(signature(expected))
    await expect(page.locator('.juego-tarjeta .card-dot')).toHaveCount(4)
    await expect(page.locator('.juego-tarjeta .card-name, .juego-tarjeta .card-dot-label, .juego-tarjeta .card-reference-dot')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cmaj7 / C6', exact: true })).toBeVisible()
    await answerRecognition(page, target, 'Fácil', 'completo')
    await expect(page.locator('.juego-pie')).toContainText('3ª inversión (bajo: 6)')
    await expectSixthSolution(page)
  }
})

test('medio: C6 con sexta en el bajo se evalúa como tercera inversión', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 9 / 4294967296 })
  await begin(page, SETS[0]!, 'Medio')
  await answerRecognition(page, SETS[0]!, 'Medio', 'completo')
  await expect(page.getByRole('heading', { name: 'Acierto completo', exact: true })).toBeVisible()
  await expectSixthSolution(page)
})

for (const [setIndex, seed, inversion] of [[0, 9, 3], [5, 23, 1]] as const) {
  test(`difícil ${SETS[setIndex]!.id} inversión ${inversion}: exige 6 y rechaza 7 en el destino de la sexta`, async ({ page }) => {
    await page.addInitScript((value) => { Math.random = () => value / 4294967296 }, seed)
    await begin(page, SETS[setIndex]!, 'Difícil')
    const shown = await truth(page, SETS[setIndex]!.id)
    expect(shown.inversion).toBe(inversion)
    const sixthSlot = shown.notes.findIndex((note) => note.degree === '6')
    expect(sixthSlot).toBeGreaterThanOrEqual(0)
    await expect(page.locator('.ficha')).toHaveCount(8)
    await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption('maj7')
    await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption(String(inversion))
    for (const [slot, note] of shown.notes.entries()) {
      const degree = slot === sixthSlot ? '7' : note.degree!
      await page.locator(`.ficha[aria-label^="Grado ${SPOKEN[degree]}"]`).click()
      await page.locator(`[data-destino="${slot}"]`).click()
    }
    await page.getByRole('button', { name: 'Verificar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Acierto parcial', exact: true })).toBeVisible()
    await expect(page.locator('.correccion li.ko')).toHaveCount(1)
    await expect(page.locator('.correccion li.ko')).toContainText('Tu respuesta: 7. Solución: 6.')
    await expectSixthSolution(page)
    await page.getByRole('button', { name: 'Salir', exact: true }).click()
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()
    await answerRecognition(page, SETS[setIndex]!, 'Difícil', 'completo')
    await expect(page.getByRole('heading', { name: 'Acierto completo', exact: true })).toBeVisible()
  })
}
