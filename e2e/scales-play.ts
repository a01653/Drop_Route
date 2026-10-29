import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

// Oráculo independiente de los juegos de escalas: la respuesta se deduce de las posiciones que dibuja la aplicación y
// de data/scales.json, sin semillas de prueba ni atajos. Lo comparten los E2E y las capturas de los manuales.
export interface ScaleNote { string: number; fret: number; degree: string }
export interface Pattern { number: number; caged: string; notes: ScaleNote[] }
export interface Scale { id: string; name: string; formula: number[]; degrees: string[]; patterns: Pattern[] }
export const scales = (JSON.parse(readFileSync(resolve('data/scales.json'), 'utf8')) as { scales: Scale[] }).scales
const OPEN: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }
export const KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
export const TARGETS: Record<string, string[]> = {
  major: ['1', '3', '5', '7'],
  'major-pentatonic': ['1', '3', '5', '6'],
  'minor-pentatonic': ['1', 'b3', '5', 'b7'],
  'natural-minor': ['1', 'b3', '5', 'b7'],
}
export const SPOKEN_SCALE: Record<string, string> = { '1': '1', '3': '3', b3: 'bemol 3', '5': '5', '6': '6', '7': '7', b7: 'bemol 7' }
const mod12 = (n: number) => ((n % 12) + 12) % 12
export const scaleNamed = (name: string) => scales.find((scale) => scale.name === name)!

export type Position = { string: number; column: number }
export const parsePositions = (label: string, unit: 'traste' | 'columna'): Position[] =>
  [...label.matchAll(new RegExp(`cuerda (\\d), ${unit} (\\d+)`, 'gi'))].map((match) => ({ string: Number(match[1]), column: Number(match[2]) }))
const relative = (positions: Position[]) => {
  const low = Math.min(...positions.map((item) => item.column))
  return positions.map((item) => `${item.string}:${item.column - low}`).sort().join(',')
}

/** Patrón de la escala con la misma figura que las posiciones dibujadas (trastes o columnas). */
export function identify(scale: Scale, positions: Position[]): Pattern {
  const wanted = relative(positions)
  const matches = scale.patterns.filter((pattern) => relative(pattern.notes.map((note) => ({ string: note.string, column: note.fret }))) === wanted)
  expect(matches).toHaveLength(1)
  return matches[0]!
}

export const degreeOf = (scale: Scale, tonicPc: number, string: number, fret: number) =>
  scale.degrees[scale.formula.indexOf(mod12(OPEN[string]! + fret - tonicPc))]!

/** Traste más grave del patrón en la tonalidad: el mismo desplazamiento para todas sus notas, sin trastes negativos. */
export function lowFretInKey(pattern: Pattern, tonicPc: number): number {
  const low = Math.min(...pattern.notes.map((note) => note.fret))
  return mod12(low + tonicPc)
}

export async function chooseScaleGame(page: Page, game: 'Reconocer patrones' | 'Ordenar patrones', scale: string, key: string) {
  await page.getByRole('button', { name: game, exact: true }).click()
  await page.getByRole('button', { name: scale, exact: true }).click()
  await page.getByLabel('Tonalidad').selectOption({ label: key })
}

export async function tonicOf(page: Page): Promise<number> {
  const text = (await page.locator('.juego-tonica').innerText()).replace('Tónica:', '').trim()
  return KEYS.indexOf(text)
}

/** Botones de las notas en Medio y Difícil, con su cuerda y traste. */
export async function notePositions(page: Page): Promise<{ button: Locator; string: number; fret: number }[]> {
  const buttons = page.locator('button[data-nota]')
  const out = []
  for (let i = 0; i < (await buttons.count()); i += 1) {
    const button = buttons.nth(i)
    const [, string, fret] = (await button.getAttribute('aria-label'))!.match(/Cuerda (\d), traste (\d+)/)!
    out.push({ button, string: Number(string), fret: Number(fret) })
  }
  return out
}

/** Tarjetas de «Ordenar patrones» identificadas por su figura, y su orden correcto de grave a agudo. */
export async function orderCards(page: Page, scale: Scale, tonicPc: number) {
  const cards = page.locator('.orden-tarjeta')
  const identified = []
  for (let i = 0; i < (await cards.count()); i += 1) {
    const label = (await cards.nth(i).locator('svg').getAttribute('aria-label'))!
    identified.push({ index: i, label, pattern: identify(scale, parsePositions(label, 'columna')) })
  }
  const ordered = [...identified].sort((a, b) => lowFretInKey(a.pattern, tonicPc) - lowFretInKey(b.pattern, tonicPc))
  return { cards, identified, ordered }
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E']
