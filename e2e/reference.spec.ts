import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Oráculo independiente: se renderiza references/laminas-drop-original.html en el navegador y se
// compara su DOM con el de las tarjetas de la aplicación, para las 112 formas.
const SETS = ['Drop 2 · set 1', 'Drop 2 · set 2', 'Drop 2 · set 3', 'Drop 3 · set 1', 'Drop 3 · set 2', 'Drop 2+4 · set 1', 'Drop 2+4 · set 2']
const TOLERANCE = 0.06
const GHOST = '#dfe1ea'
const FRET = 44
// Tarjetas donde la plantilla dibuja la sustitución C6 (sexta amarilla y séptima fantasma): "set/índice".
// El índice recorre calidad × inversión, así que 3 es Cmaj7 en 3.ª inversión y 1 en 1.ª.
const C6_CARDS = [
  'Drop 2 · set 1/3',
  'Drop 2 · set 2/3',
  'Drop 2 · set 3/3',
  'Drop 3 · set 1/3',
  'Drop 3 · set 2/3',
  'Drop 2+4 · set 1/1',
  'Drop 2+4 · set 1/3',
  'Drop 2+4 · set 2/1',
  'Drop 2+4 · set 2/3',
]

interface Dot {
  x: number
  y: number
  label: string
  color: string
}
interface CardData {
  name: string
  family: string
  background: string
  border: string
  dots: Dot[]
  nutWidth: number
  fretNumbers: number[]
  marks: { x: number; y: number }[]
}

async function readOriginal(page: Page): Promise<CardData[][]> {
  await page.goto(pathToFileURL(resolve('references/laminas-drop-original.html')).href)
  await page.waitForFunction(() => {
    const areas = [...document.querySelectorAll('div')].filter((d) => /width:\s*221px;\s*height:\s*101px/.test(d.getAttribute('style') ?? ''))
    return document.querySelectorAll('section.page').length === 12 && areas.length >= 112
  })
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(() => {
    const hex = (rgb: string) => '#' + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
    return [...document.querySelectorAll('section.page')].slice(0, 7).map((section) => {
      const areas = [...section.querySelectorAll('div')].filter((d) => /width:\s*221px;\s*height:\s*101px/.test(d.getAttribute('style') ?? ''))
      return areas.map((area) => {
        const box = area.getBoundingClientRect()
        const scale = box.width / 221
        const card = area.parentElement as HTMLElement
        const header = card.firstElementChild as HTMLElement
        const kids = [...area.children] as HTMLElement[]
        const at = (el: Element) => {
          const r = el.getBoundingClientRect()
          return { x: (r.left + r.width / 2 - box.left) / scale, y: (r.top + r.height / 2 - box.top) / scale }
        }
        const nut = kids.find((k) => getComputedStyle(k).backgroundColor === 'rgb(20, 24, 58)' && Math.round(k.getBoundingClientRect().height / scale) === 104)
        return {
          name: (header.children[0]?.textContent ?? '').trim(),
          family: (header.children[1]?.textContent ?? '').trim(),
          background: hex(getComputedStyle(card).backgroundColor),
          border: hex(getComputedStyle(card).borderTopColor),
          dots: kids
            .filter((k) => /width:\s*18px;\s*height:\s*18px/.test(k.getAttribute('style') ?? ''))
            .map((k) => ({ ...at(k), label: (k.textContent ?? '').trim(), color: hex(getComputedStyle(k).backgroundColor) })),
          nutWidth: nut ? nut.getBoundingClientRect().width / scale : 0,
          fretNumbers: kids.filter((k) => /top:\s*114px/.test(k.getAttribute('style') ?? '')).map((k) => Number(k.textContent)),
          marks: kids.filter((k) => k.tagName.toLowerCase() === 'svg').map(at),
        }
      })
    })
  })
}

async function readApp(page: Page): Promise<CardData[]> {
  return page.evaluate(() => {
    const hex = (rgb: string) => '#' + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
    return [...document.querySelectorAll('.revision-tarjeta svg.fretboard-card')].map((svg) => {
      const box = svg.getBoundingClientRect()
      const scale = box.width / (svg as SVGSVGElement).viewBox.baseVal.width
      const firstFret = svg.querySelector('.card-fret')!.getBoundingClientRect()
      const firstString = svg.querySelector('.card-string')!.getBoundingClientRect()
      const x0 = firstFret.left
      const y0 = firstString.top + firstString.height / 2
      const at = (el: Element) => {
        const r = el.getBoundingClientRect()
        return { x: (r.left + r.width / 2 - x0) / scale, y: (r.top + r.height / 2 - y0) / scale }
      }
      const background = svg.querySelector('.card-background')!
      const nut = svg.querySelector('.card-nut')
      return {
        name: svg.querySelector('.card-name')?.textContent ?? '',
        family: svg.querySelector('.card-family')?.textContent ?? '',
        background: hex(getComputedStyle(background).fill),
        border: hex(getComputedStyle(background).stroke),
        dots: [...svg.querySelectorAll('.card-dot')].map((circle) => {
          const group = circle.parentElement as Element
          const text = group.tagName === 'g' ? group.querySelector('text')?.textContent ?? '' : ''
          const flats = group.tagName === 'g' ? group.querySelectorAll('path').length : 0
          return { ...at(circle), label: 'b'.repeat(flats) + text, color: hex(getComputedStyle(circle).fill) }
        }),
        nutWidth: nut ? nut.getBoundingClientRect().width / scale : 0,
        fretNumbers: [...svg.querySelectorAll('.card-fret-number')].map((el) => Number(el.textContent)),
        marks: [...svg.querySelectorAll('.card-mute')].map(at),
      }
    })
  })
}

const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), `${what}: ${a.toFixed(2)} frente a ${b.toFixed(2)}`).toBeLessThanOrEqual(TOLERANCE)

test('las 112 tarjetas coinciden con las de la plantilla original', async ({ page, context }) => {
  test.setTimeout(120_000)
  const reference = await context.newPage()
  const original = await readOriginal(reference)
  await reference.close()
  expect(original.map((cards) => cards.length)).toEqual([16, 16, 16, 16, 16, 16, 16])

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/#/revision')
  await expect(page.getByRole('heading', { level: 1, name: 'Revisión de tarjetas e icono' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const c6Cards = new Set<string>()
  let compared = 0
  for (const [setIndex, set] of SETS.entries()) {
    await page.locator('.revision-opciones button', { hasText: set }).click()
    await expect(page.locator('.revision-tarjeta')).toHaveCount(16)
    for (const view of ['Neutra', 'Solución']) {
      await page.getByRole('button', { name: view, exact: true }).click()
      const mine = await readApp(page)
      expect(mine).toHaveLength(16)
      for (const [index, card] of mine.entries()) {
        const reference = original[setIndex]![index]!
        const id = `${set}, tarjeta ${index + 1}, vista ${view}`
        compared += 1

        // Misma ventana que la plantilla en las 112 tarjetas, también las que cuentan la sexta de C6.
        expect(card.fretNumbers, `${id}: ventana`).toEqual(reference.fretNumbers)

        // C6: la plantilla baja la séptima dos trastes y deja un fantasma gris donde está el maj7.
        // La revisión muestra la sexta y, en solución, la séptima gris de referencia.
        const sixth = reference.dots.find((dot) => dot.label === '6')
        expect(sixth !== undefined, `${id}: C6 en la plantilla`).toBe(C6_CARDS.includes(`${set}/${index}`))
        if (sixth) {
          c6Cards.add(`${set}/${index}`)
          const ghost = reference.dots.find((dot) => dot.color === GHOST)
          expect(ghost, `${id}: séptima fantasma`).toBeDefined()
          near(sixth.y, ghost!.y, `${id} C6 cuerda`)
          near(ghost!.x - sixth.x, 2 * FRET, `${id} C6 dos trastes`)
          expect(card.dots.some((dot) => Math.abs(dot.x - sixth.x) < 0.5 && Math.abs(dot.y - sixth.y) < 0.5), `${id}: sexta de C6 dibujada`).toBe(true)
          expect(card.dots.some((dot) => Math.abs(dot.x - ghost!.x) < 0.5 && Math.abs(dot.y - ghost!.y) < 0.5), `${id}: séptima de referencia`).toBe(view === 'Solución')
          if (view === 'Solución') expect(card.name, `${id}: nombre de la variante`).toBe('Cmaj7 – C6')
        }
        const originalDots = reference.dots.filter((dot) => view === 'Solución' || dot.color !== GHOST)
        expect(card.dots, id).toHaveLength(originalDots.length)
        for (const dot of originalDots) {
          const own = card.dots.find((candidate) => Math.abs(candidate.y - dot.y) < 0.5 && (view !== 'Solución' || candidate.label === dot.label))
          expect(own, `${id}: no hay círculo en la cuerda y=${dot.y}`).toBeDefined()
          near(own!.x, dot.x, `${id} x`)
          near(own!.y, dot.y, `${id} y`)
          if (view === 'Solución') {
            expect(own!.label, `${id} etiqueta`).toBe(dot.label)
            expect(own!.color, `${id} color`).toBe(dot.color)
          }
        }
        expect(card.nutWidth > 0, `${id}: cejuelo`).toBe(reference.nutWidth > 0)
        if (card.nutWidth > 0) near(card.nutWidth, reference.nutWidth, `${id} cejuelo`)
        expect(card.marks, id).toHaveLength(reference.marks.length)
        for (const mark of reference.marks) {
          const own = card.marks.find((candidate) => Math.abs(candidate.y - mark.y) < 0.5)
          expect(own, `${id}: marca en y=${mark.y}`).toBeDefined()
          near(own!.x, mark.x, `${id} marca x`)
        }
        if (view === 'Solución') {
          expect(card.name.replace(' – ', ' - '), `${id}: nombre`).toBe(reference.name)
          expect(card.family, id).toBe(reference.family)
          expect(card.background, `${id} fondo`).toBe(reference.background)
          expect(card.border, `${id} borde`).toBe(reference.border)
        }
      }
    }
  }
  expect(compared).toBe(224)
  expect([...c6Cards].sort()).toEqual([...C6_CARDS].sort())
})
