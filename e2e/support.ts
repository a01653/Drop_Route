import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Oráculo independiente: la respuesta correcta se deduce de las posiciones que dibuja la tarjeta y de
// data/catalog.json, nunca de un atajo de la aplicación ni de una semilla de pruebas.
export interface Note {
  string: number
  fret: number
  degree?: string
}
export interface Voicing {
  id: string
  setId: string
  quality: string
  name: string
  inversion: number
  quizEnabled: boolean
  notes: Note[]
  cardName?: string
}
export const catalog = JSON.parse(readFileSync(resolve('data/catalog.json'), 'utf8')) as {
  inversions: string[]
  voicings: Voicing[]
}
export const signature = (notes: Note[]) =>
  notes
    .map((note) => `${note.string}:${note.fret}`)
    .sort()
    .join(',')

export const SETS = [
  { drop: 'Drop 2', set: 'Set 1', id: 'D2S1' },
  { drop: 'Drop 2', set: 'Set 2', id: 'D2S2' },
  { drop: 'Drop 2', set: 'Set 3', id: 'D2S3' },
  { drop: 'Drop 3', set: 'Set 1', id: 'D3S1' },
  { drop: 'Drop 3', set: 'Set 2', id: 'D3S2' },
  { drop: 'Drop 2+4', set: 'Set 1', id: 'D24S1' },
  { drop: 'Drop 2+4', set: 'Set 2', id: 'D24S2' },
]
export const FIRST = SETS[5]! // Drop 2+4, set 1: la familia con la ventana de la plantilla en el traste 12
export const CHORDS = ['Cmaj7', 'C7', 'Cm7', 'Cm7(b5)']
export const choiceName = (name: string) => name === 'Cmaj7' ? 'Cmaj7 / C6' : name
export const cardName = (voicing: Voicing) => voicing.cardName ?? voicing.name

/** Oráculo físico independiente: la sexta está dos trastes bajo la séptima de la fuente. */
export function questionShape(source: Voicing): Voicing {
  const sixth = source.quality === 'maj7' && (source.inversion === 3 || (source.inversion === 1 && ['D24S1', 'D24S2'].includes(source.setId)))
  return sixth ? {
    ...source, cardName: 'Cmaj7 – C6',
    notes: source.notes.map((note) => note.degree === '7' ? { ...note, fret: note.fret - 2, degree: '6' } : { ...note }),
  } : source
}
export const MUSICAL_COLORS = ['#E11D48', '#0284C7', '#059669', '#EDBC07']

export async function begin(page: Page, target: (typeof SETS)[number], difficulty: 'Fácil' | 'Medio' | 'Difícil') {
  await page.goto('/')
  await page.getByRole('button', { name: target.drop, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${target.set}\\b`) }).click()
  await page.getByRole('button', { name: difficulty, exact: true }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 1' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

/** Lo que se ve: posiciones de la tarjeta neutra. */
export async function visiblePositions(page: Page): Promise<Note[]> {
  const label = (await page.locator('.juego-tarjeta svg').getAttribute('aria-label')) ?? ''
  const notes = [...label.matchAll(/cuerda (\d), traste (\d+)/g)].map((match) => ({ string: Number(match[1]), fret: Number(match[2]) }))
  expect(notes, label).toHaveLength(4)
  return notes
}

/** La solución real: la forma del catálogo con esas posiciones en ese set. */
export async function truth(page: Page, setId: string): Promise<Voicing> {
  const wanted = signature(await visiblePositions(page))
  const matches = catalog.voicings.filter((item) => item.quizEnabled && item.setId === setId).map(questionShape).filter((item) => signature(item.notes) === wanted)
  expect(matches, `posiciones ${wanted} en ${setId}`).toHaveLength(1)
  return matches[0]!
}
