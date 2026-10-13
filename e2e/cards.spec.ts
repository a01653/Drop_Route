import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const SETS = [
  'Drop 2 · set 1',
  'Drop 2 · set 2',
  'Drop 2 · set 3',
  'Drop 3 · set 1',
  'Drop 3 · set 2',
  'Drop 2+4 · set 1',
  'Drop 2+4 · set 2',
]
const WIDTHS = [360, 390, 430]
const HINTS = /maj7|m7b5|Cm7|C7|inversi|Fundamental|bajo:|MAYOR|DOMINANTE|MENOR|SEMIDISMINUIDO/
const MUSICAL_COLORS = ['rgb(225, 29, 72)', 'rgb(2, 132, 199)', 'rgb(5, 150, 105)', 'rgb(237, 188, 7)']

async function openReview(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.goto('/#/revision')
  await expect(page.getByRole('heading', { level: 1, name: 'Revisión de tarjetas e icono' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

async function chooseSet(page: Page, name: string) {
  const button = page.locator('.revision-opciones button', { hasText: name })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.revision-tarjeta')).toHaveCount(16)
}

// Mide en el navegador, sobre el DOM renderizado, no con las cifras del código.
async function measureCards(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = []
    const cards = [...document.querySelectorAll('.revision-tarjeta')]
    const tolerance = 0.75
    cards.forEach((li, index) => {
      const svg = li.querySelector('svg.fretboard-card') as SVGSVGElement
      const box = svg.getBoundingClientRect()
      const at = `tarjeta ${index + 1}`
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) issues.push(`${at}: fuera de la pantalla`)
      if (box.width < 250) issues.push(`${at}: demasiado pequeña (${box.width.toFixed(0)} px)`)
      const frets = [...svg.querySelectorAll('.card-fret')].map((el) => el.getBoundingClientRect())
      const strings = [...svg.querySelectorAll('.card-string')].map((el) => el.getBoundingClientRect())
      if (frets.length !== 6 || strings.length !== 6) issues.push(`${at}: ${frets.length} trastes y ${strings.length} cuerdas`)
      const dots = [...svg.querySelectorAll('.card-dot')]
      if (dots.length !== 4) issues.push(`${at}: ${dots.length} círculos`)
      const scale = box.width / svg.viewBox.baseVal.width
      for (const dot of dots) {
        const rect = dot.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const column = frets.findIndex((fret, i) => i < frets.length - 1 && cx > fret.left && cx < frets[i + 1]!.left)
        if (column < 0) {
          issues.push(`${at}: círculo fuera de los trastes`)
          continue
        }
        const midpoint = (frets[column]!.left + frets[column + 1]!.left) / 2
        if (Math.abs(cx - midpoint) > tolerance) issues.push(`${at}: círculo descentrado ${(cx - midpoint).toFixed(2)} px entre trastes`)
        const string = strings.findIndex((line) => Math.abs(line.top + line.height / 2 - cy) <= tolerance)
        if (string < 0) issues.push(`${at}: círculo que no está sobre ninguna cuerda`)
        if (Math.abs(rect.width - 18 * scale) > 1.5) issues.push(`${at}: diámetro ${rect.width.toFixed(1)} px, esperado ${(18 * scale).toFixed(1)}`)
        if (rect.left < box.left || rect.right > box.right || rect.top < box.top || rect.bottom > box.bottom) issues.push(`${at}: círculo recortado por la tarjeta`)
        if (rect.left < frets[0]!.left || rect.right > frets[frets.length - 1]!.left) issues.push(`${at}: círculo fuera del mástil`)
      }
      const numbers = [...svg.querySelectorAll('.card-fret-number')].map((el) => Number(el.textContent))
      if (numbers.length !== 5 || numbers.some((n, i) => n !== numbers[0]! + i)) issues.push(`${at}: numeración de trastes ${numbers.join(',')}`)
      const stringNumbers = [...svg.querySelectorAll('.card-string-number')].map((el) => el.textContent).join('')
      if (stringNumbers !== '123456') issues.push(`${at}: numeración de cuerdas ${stringNumbers}`)
      if (svg.querySelectorAll('.card-mute').length !== 2) issues.push(`${at}: marcas de cuerda no tocada`)
    })
    return { cards: cards.length, issues, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
}

for (const width of WIDTHS) {
  test(`a ${width} px las 112 tarjetas caben, sin recortes y con los círculos centrados entre trastes`, async ({ page }) => {
    await openReview(page, width)
    let total = 0
    for (const view of ['Neutra', 'Solución']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      for (const set of SETS) {
        await chooseSet(page, set)
        const result = await measureCards(page)
        total += result.cards
        expect(result.issues, `${set}, vista ${view}`).toEqual([])
        expect(result.overflow, `desplazamiento horizontal en ${set}, vista ${view}`).toBeLessThanOrEqual(0)
      }
    }
    expect(total).toBe(224)
  })
}

test('los controles de la revisión tienen un área táctil de al menos 48 px', async ({ page }) => {
  await openReview(page, 360)
  const boxes = await page.getByRole('button').evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return { name: button.textContent?.trim(), width: rect.width, height: rect.height }
    }),
  )
  expect(boxes).toHaveLength(9)
  for (const box of boxes) {
    expect(box.height, box.name).toBeGreaterThanOrEqual(48)
    expect(box.width, box.name).toBeGreaterThanOrEqual(48)
  }
})

test('la vista neutra no revela nada de la solución en ningún set', async ({ page }) => {
  await openReview(page, 390)
  for (const set of SETS) {
    await chooseSet(page, set)
    const report = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.revision-tarjeta')]
      const svgs = cards.map((li) => li.querySelector('svg')!)
      const style = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop)
      return {
        dotFills: [...new Set(svgs.flatMap((svg) => [...svg.querySelectorAll('.card-dot')].map((el) => style(el, 'fill') + '|' + style(el, 'stroke'))))],
        backgrounds: [...new Set(svgs.map((svg) => style(svg.querySelector('.card-background')!, 'fill') + '|' + style(svg.querySelector('.card-background')!, 'stroke')))],
        texts: [...new Set(svgs.flatMap((svg) => [...svg.querySelectorAll('text')].map((el) => el.textContent ?? '')))],
        labels: svgs.map((svg) => svg.getAttribute('aria-label') ?? ''),
        titles: document.querySelectorAll('svg title, svg desc, [title]').length,
        flats: document.querySelectorAll('.revision-rejilla path[d^="M0 -8"]').length,
        main: document.querySelector('main')!.innerText,
      }
    })
    expect(report.dotFills, set).toHaveLength(1)
    expect(report.backgrounds, set).toHaveLength(1)
    expect(MUSICAL_COLORS.some((color) => report.dotFills[0]!.includes(color)), set).toBe(false)
    for (const text of report.texts) expect(text, set).toMatch(/^\d+$/)
    for (const label of report.labels) {
      expect(label, set).toMatch(/^Posición de 4 notas: cuerda \d, traste \d+(; cuerda \d, traste \d+){3}\.$/)
      expect(label, set).not.toMatch(HINTS)
    }
    expect(report.titles, set).toBe(0)
    expect(report.flats, set).toBe(0)
    expect(report.main, set).not.toMatch(HINTS)
    await expect(page.getByRole('img', { name: HINTS })).toHaveCount(0)
  }
})

test('la vista de solución recupera nombres, grados y colores musicales', async ({ page }) => {
  await openReview(page, 390)
  await page.getByRole('button', { name: 'Solución', exact: true }).click()
  await chooseSet(page, 'Drop 2 · set 1')
  const first = page.locator('.revision-tarjeta').first()
  await expect(first.locator('.card-name')).toHaveText('Cmaj7')
  await expect(first.locator('.card-family')).toHaveText('MAYOR 7')
  await expect(first).toContainText('Fundamental · bajo: 1')
  const report = await page.evaluate(() => {
    const fills = [...document.querySelectorAll('.revision-rejilla .card-dot')].map((el) => getComputedStyle(el).fill)
    const names = [...document.querySelectorAll('.revision-rejilla .card-name')].map((el) => el.textContent)
    return { fills: [...new Set(fills)].sort(), names: [...new Set(names)] }
  })
  expect(report.fills).toEqual([...MUSICAL_COLORS].sort())
  expect(report.names).toEqual(['Cmaj7', 'C7', 'Cm7', 'Cm7(b5)'])
  await expect(page.getByRole('img', { name: /^Cmaj7, Fundamental: cuerda 4, traste 10, grado 1;/ })).toHaveCount(1)
  await page.getByRole('button', { name: 'Neutra', exact: true }).click()
  await expect(page.locator('.revision-rejilla .card-name')).toHaveCount(0)
})

test('el icono se ve a tamaño real y sus exportaciones cargan', async ({ page }) => {
  await openReview(page, 360)
  const images = await page.locator('.revision-icono img').evaluateAll((imgs) =>
    (imgs as HTMLImageElement[]).map((img) => ({
      alt: img.alt,
      natural: img.naturalWidth,
      width: img.getBoundingClientRect().width,
      height: img.getBoundingClientRect().height,
    })),
  )
  expect(images).toHaveLength(11)
  for (const image of images) expect(image.natural, image.alt).toBeGreaterThan(0)
  const at32 = images.filter((image) => /32 píxeles/.test(image.alt))
  expect(at32).toHaveLength(2)
  for (const image of at32) {
    expect([image.width, image.height]).toEqual([32, 32])
    expect(image.natural).toBe(32)
  }
})

test('la pantalla de arranque enlaza con la revisión y se puede volver', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await page.getByRole('link', { name: 'Revisar tarjetas e icono' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Revisión de tarjetas e icono' })).toBeVisible()
  await page.getByRole('link', { name: /Volver al inicio/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
})
