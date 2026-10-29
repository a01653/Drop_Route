import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  LETTERS,
  SPOKEN_SCALE,
  TARGETS,
  chooseScaleGame,
  degreeOf,
  identify,
  notePositions,
  orderCards,
  parsePositions,
  scaleNamed,
  tonicOf,
} from './scales-play'

// La respuesta se deduce de las posiciones dibujadas y de data/scales.json (véase scales-play.ts).

async function openScaleGame(page: Page, game: 'Reconocer patrones' | 'Ordenar patrones', scale: string, key: string) {
  await page.goto('/')
  await chooseScaleGame(page, game, scale, key)
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

test('estudio de patrones: cinco formas, tonalidad y orden de grave a agudo', async ({ page }) => {
  await page.goto('/#/study')
  await page.getByRole('button', { name: 'Patrones de escala' }).click()
  await expect(page.locator('.study-scale-pattern svg')).toHaveCount(5)
  await expect(page.locator('.study-scale-pattern').first()).toContainText('Patrón 1 · forma E · trastes 7–10')
  await page.getByRole('button', { name: 'Pentatónica menor' }).click()
  await page.getByLabel('Tonalidad').selectOption({ label: 'E' })
  await page.getByRole('button', { name: 'De grave a agudo' }).click()
  await expect(page.getByText('De grave a agudo en E: 1 – 2 – 3 – 4 – 5.')).toBeVisible()
  await expect(page.locator('.study-scale-pattern').first()).toContainText('Patrón 1 · forma Em · trastes 0–3')
  await expect(page.locator('.study-scale-pattern').first().locator('.card-nut')).toHaveCount(1)
  await page.getByRole('button', { name: 'Mayor', exact: true }).click()
  await page.getByLabel('Tonalidad').selectOption({ label: 'C' })
  await expect(page.getByText('De grave a agudo en C: 3 – 4 – 5 – 1 – 2.')).toBeVisible()
  await noHorizontalScroll(page)
})

test('Reconocer patrones en Fácil: acierto y error con la solución marcada', async ({ page }) => {
  await openScaleGame(page, 'Reconocer patrones', 'Mayor', 'Aleatoria (una en cada pregunta)')
  await page.getByRole('button', { name: 'Fácil' }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  const scale = scaleNamed('Mayor')
  const read = async () => identify(scale, parsePositions((await page.locator('.juego-tarjeta svg').getAttribute('aria-label'))!, 'traste'))

  const first = await read()
  await expect(page.locator('.juego-tarjeta svg')).not.toHaveAttribute('aria-label', /grado/)
  await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
  await page.getByRole('button', { name: new RegExp(`^Patrón ${first.number}`) }).click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await expect(page.locator('.juego-tarjeta .scale-dot')).toHaveCount(first.notes.length)

  await page.getByRole('button', { name: 'Siguiente' }).click()
  const second = await read()
  const wrong = second.number === 5 ? 1 : second.number + 1
  await page.getByRole('button', { name: new RegExp(`^Patrón ${wrong}`) }).click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Incorrecto' })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^Patrón ${second.number}`) })).toHaveClass(/ok/)
  await expect(page.getByRole('button', { name: new RegExp(`^Patrón ${wrong}`) })).toHaveClass(/ko/)
  await noHorizontalScroll(page)
})

test('Reconocer patrones en Medio: hay que marcar todas las tónicas, también con el teclado', async ({ page }) => {
  await openScaleGame(page, 'Reconocer patrones', 'Pentatónica menor', 'E')
  await page.getByRole('button', { name: 'Medio' }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  const scale = scaleNamed('Pentatónica menor')
  const tonic = await tonicOf(page)
  expect(tonic).toBe(4)
  const notes = await notePositions(page)
  const pattern = identify(scale, notes.map((note) => ({ string: note.string, column: note.fret })))
  const tonics = notes.filter((note) => degreeOf(scale, tonic, note.string, note.fret) === '1')
  expect(tonics.length).toBeGreaterThanOrEqual(2)

  await page.getByRole('button', { name: new RegExp(`^Patrón ${pattern.number}`) }).click()
  await tonics[0]!.button.focus()
  await page.keyboard.press('Enter')
  await expect(tonics[0]!.button).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto parcial' })).toBeVisible()
  await expect(page.getByText(/Tónicas: incorrecto\. 1 de \d+ marcadas\. Faltan:/)).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  const next = await notePositions(page)
  const nextPattern = identify(scale, next.map((note) => ({ string: note.string, column: note.fret })))
  await page.getByRole('button', { name: new RegExp(`^Patrón ${nextPattern.number}`) }).click()
  for (const note of next) if (degreeOf(scale, tonic, note.string, note.fret) === '1') await note.button.click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await noHorizontalScroll(page)

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.locator('.progreso')).toContainText('Reconocer patrones')
  await expect(page.locator('.progreso-lista').first()).toContainText('Patrones · Pentatónica menor · Medio')
  await expect(page.locator('.progreso-lista').first()).toContainText('1 de 2 (50 %)')
})

test('Reconocer patrones en Difícil: tónicas, terceras, quintas y sextas de la pentatónica mayor', async ({ page }) => {
  await openScaleGame(page, 'Reconocer patrones', 'Pentatónica mayor', 'A♭')
  await page.getByRole('button', { name: 'Difícil' }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  const scale = scaleNamed('Pentatónica mayor')
  const tonic = await tonicOf(page)
  const notes = await notePositions(page)
  const pattern = identify(scale, notes.map((note) => ({ string: note.string, column: note.fret })))
  await page.getByRole('button', { name: new RegExp(`^Patrón ${pattern.number}`) }).click()
  for (const degree of TARGETS['major-pentatonic']!) {
    await page.getByRole('button', { name: `Grado ${SPOKEN_SCALE[degree]}`, exact: true }).click()
    for (const note of notes) if (degreeOf(scale, tonic, note.string, note.fret) === degree) await note.button.click()
  }
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await expect(page.locator('.tus-marcas .revision-ko')).toHaveCount(0)
  await expect(page.locator('.tus-marcas .revision-falta')).toHaveCount(0)
  for (const button of await page.locator('.opciones-patron button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }
})

test('Ordenar patrones: tarjetas sin trastes, orden de grave a agudo según la tonalidad y revisión', async ({ page }) => {
  await openScaleGame(page, 'Ordenar patrones', 'Menor natural', 'G')
  await page.getByRole('button', { name: 'Empezar' }).click()
  const scale = scaleNamed('Menor natural')
  const tonic = await tonicOf(page)
  expect(tonic).toBe(7)
  const { cards, identified, ordered } = await orderCards(page, scale, tonic)
  await expect(cards).toHaveCount(5)
  await expect(page.locator('.orden-tarjetas .card-fret-number')).toHaveCount(0)
  await expect(page.locator('.orden-tarjetas .card-nut')).toHaveCount(0)
  for (const item of identified) {
    expect(item.label).not.toMatch(/traste/)
    expect((await cards.nth(item.index).boundingBox())!.height).toBeGreaterThanOrEqual(48)
  }

  await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
  for (const item of ordered) await page.getByRole('button', { name: new RegExp(`^Tarjeta ${LETTERS[item.index]}`) }).click()
  await expect(page.locator('.orden-actual')).toHaveText(`Tu orden: ${ordered.map((item) => LETTERS[item.index]).join(' · ')}`)
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Orden correcto' })).toBeVisible()
  await expect(page.getByText(`De grave a agudo en G: ${ordered.map((item) => item.pattern.number).join(' – ')}.`)).toBeVisible()
  await expect(page.locator('.orden-solucion li')).toHaveCount(5)
  await noHorizontalScroll(page)

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: /^Tarjeta A/ }).click()
  await page.getByRole('button', { name: /^Tarjeta A/ }).click()
  await expect(page.locator('.orden-actual')).toHaveText('Tu orden: — · — · — · — · —')
  await page.getByRole('button', { name: 'Terminar y revisar' }).click()
  await expect(page.getByRole('heading', { name: 'Revisión del test' })).toBeVisible()
  await expect(page.getByText('1 de 2 órdenes correctos.', { exact: false })).toBeVisible()
  await expect(page.getByText('Sin verificar')).toBeVisible()
})

for (const width of [360, 390, 430]) {
  test(`juegos de escalas a ${width} px: sin desplazamiento horizontal y controles de 48 px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await openScaleGame(page, 'Reconocer patrones', 'Menor natural', 'B')
    await noHorizontalScroll(page)
    await page.getByRole('button', { name: 'Difícil' }).click()
    await page.getByRole('button', { name: 'Empezar' }).click()
    await noHorizontalScroll(page)
    for (const control of await page.locator('.fichas button, .opciones-patron button').all()) {
      const box = (await control.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(48)
      expect(box.width).toBeGreaterThanOrEqual(48)
    }
    const board = (await page.locator('.tablero-escala').boundingBox())!
    expect(board.x).toBeGreaterThanOrEqual(0)
    expect(board.x + board.width).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Salir' }).click()
    await page.getByRole('button', { name: 'Ordenar patrones', exact: true }).click()
    await page.getByRole('button', { name: 'Empezar' }).click()
    await noHorizontalScroll(page)
  })
}
