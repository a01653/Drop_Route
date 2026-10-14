import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { SETS, catalog, signature, truth } from './support'
import type { Note, Voicing } from './support'

// Ayudas compartidas por los E2E de progreso y de modo sin conexión. Juegan solo por la interfaz y toman como
// oráculo lo que se ve (posiciones de las tarjetas) más data/catalog.json y data/routes.json. Las claves y los
// textos de aquí son los del contrato guardado: si cambian en la aplicación, estos tests deben fallar.

export type Target = (typeof SETS)[number]
export type Difficulty = 'Fácil' | 'Medio' | 'Difícil'
export type Mode = 'Mayor' | 'Menor'
export type Stretch = 'II → V' | 'V → I' | 'II → V → I'

export const STORAGE_KEY = 'drop-route:state'
export const DAMAGED_COPY_KEY = 'drop-route:state:damaged'

/** Contadores esperados por clave guardada: [aciertos, intentos]. */
export type Expected = Record<string, [number, number]>

// ---------------------------------------------------------------------------------------------------------------
// Menú y sesión
// ---------------------------------------------------------------------------------------------------------------

const STRETCH_NAMES: Record<Stretch, RegExp> = {
  'II → V': /^II → V del II al V$/,
  'V → I': /^V → I del V al I$/,
  'II → V → I': /^II → V → I los dos tramos seguidos$/,
}

export async function configureRecognition(page: Page, target: Target, difficulty: Difficulty) {
  await page.getByRole('button', { name: 'Reconocer voicings', exact: true }).click()
  await page.getByRole('button', { name: target.drop, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${target.set}\\b`) }).click()
  await page.getByRole('button', { name: difficulty, exact: true }).click()
}

export async function configureRoutes(page: Page, options: { set: Target; mode: Mode; stretch: Stretch }) {
  await page.getByRole('button', { name: 'Rutas II-V-I', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${options.set.set}\\b`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${options.mode}\\b`) }).click()
  await page.getByRole('button', { name: STRETCH_NAMES[options.stretch] }).click()
}

export async function startQuestion(page: Page) {
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Pregunta \d+$/ })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

export async function leave(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
}

/** «Siguiente», o «Siguiente: V → I» al pasar de un tramo al otro: solo hay uno de los dos a la vez. */
export async function nextQuestion(page: Page, number: number, name: string | RegExp = /^Siguiente/) {
  await page.getByRole('button', { name, exact: typeof name === 'string' }).click()
  await expect(page.getByRole('heading', { level: 1, name: `Pregunta ${number}` })).toBeVisible()
}

// ---------------------------------------------------------------------------------------------------------------
// Reconocimiento
// ---------------------------------------------------------------------------------------------------------------

export const SPOKEN: Record<string, string> = { '1': '1', '3': '3', b3: 'bemol 3', '5': '5', b5: 'bemol 5', '7': '7', b7: 'bemol 7' }
export const BANK = ['1', '3', 'b3', '5', 'b5', '7', 'b7']
const QUALITIES = [...new Set(catalog.voicings.filter((item) => item.quizEnabled).map((item) => item.quality))]

/**
 * Qué se contesta. «acorde-incorrecto» y «inversion-incorrecta» cambian solo ese campo y dejan correcto lo demás;
 * «grado-incorrecto» (solo difícil) cambia un único círculo.
 */
export type Answer = 'completo' | 'acorde-incorrecto' | 'inversion-incorrecta' | 'grado-incorrecto'

/** Contesta la pregunta abierta según su nivel y verifica una vez. Devuelve la forma que se veía. */
export async function answerRecognition(page: Page, target: Target, difficulty: Difficulty, answer: Answer): Promise<Voicing> {
  const voicing = await truth(page, target.id)
  const quality = answer === 'acorde-incorrecto' ? QUALITIES.find((item) => item !== voicing.quality)! : voicing.quality
  const inversion = answer === 'inversion-incorrecta' ? (voicing.inversion + 1) % 4 : voicing.inversion

  if (difficulty === 'Fácil') {
    expect(answer, 'en fácil solo se contesta el acorde').toMatch(/^(completo|acorde-incorrecto)$/)
    const name = answer === 'completo' ? voicing.name : catalog.voicings.find((item) => item.quizEnabled && item.quality === quality)!.name
    await page.getByRole('button', { name, exact: true }).click()
  } else {
    await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption(quality)
    await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption(String(inversion))
  }
  if (difficulty === 'Difícil') {
    const degrees = voicing.notes.map((note) => note.degree!)
    const spare = BANK.find((degree) => !degrees.includes(degree))!
    for (const [slot, degree] of degrees.entries()) {
      const placed = answer === 'grado-incorrecto' && slot === 2 ? spare : degree
      await page.locator(`.ficha[aria-label^="Grado ${SPOKEN[placed]}"]`).click()
      await page.locator(`[data-destino="${slot}"]`).click()
    }
  } else {
    expect(answer, 'solo difícil tiene grados').not.toBe('grado-incorrecto')
  }

  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.locator('.resultado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verificar' })).toHaveCount(0)
  const complete = page.getByRole('heading', { name: 'Acierto completo' })
  if (answer === 'completo') await expect(complete).toBeVisible()
  else await expect(complete).toHaveCount(0)
  return voicing
}

// ---------------------------------------------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------------------------------------------

interface Step {
  notes: Note[]
}
interface Route {
  id: string
  setId: string
  mode: string
  steps: Step[]
}
const routes = (JSON.parse(readFileSync(resolve('data/routes.json'), 'utf8')) as { routes: Route[] }).routes

const positionsOf = async (page: Page, selector: string): Promise<Note[]> => {
  const label = (await page.locator(`${selector} svg`).first().getAttribute('aria-label')) ?? ''
  const notes = [...label.matchAll(/cuerda (\d), traste (\d+)/g)].map((match) => ({ string: +match[1]!, fret: +match[2]! }))
  expect(notes, label).toHaveLength(4)
  return notes
}
const candidate = (page: Page, index: number) => page.getByRole('button', { name: `Candidata ${index + 1}`, exact: true })

/** Contesta la pregunta de ruta abierta: acierta la candidata de nuestra ruta o elige otra, y verifica una vez. */
export async function answerRoute(page: Page, options: { setId: string; mode: 'major' | 'minor'; from: 'II' | 'V'; correct: boolean }) {
  const { setId, mode, from, correct } = options
  const wanted = signature(await positionsOf(page, '.partida'))
  const found = routes.filter((route) => route.setId === setId && route.mode === mode && signature(route.steps[from === 'II' ? 0 : 1]!.notes) === wanted)
  expect(found, `partida ${wanted}`).toHaveLength(1)
  const route = found[0]!

  const seen: string[] = []
  for (let index = 0; index < 4; index += 1) {
    await candidate(page, index).click()
    await expect(candidate(page, index)).toHaveAttribute('aria-pressed', 'true')
    seen.push(signature(await positionsOf(page, '.candidata')))
  }
  const right = seen.indexOf(signature(route.steps[from === 'II' ? 1 : 2]!.notes))
  expect(right, 'la candidata de la ruta está entre las cuatro').toBeGreaterThanOrEqual(0)
  await candidate(page, correct ? right : (right + 1) % 4).click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: correct ? 'Es la de nuestra ruta' : 'No es la de nuestra ruta', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verificar' })).toHaveCount(0)
  return route
}

// ---------------------------------------------------------------------------------------------------------------
// Contadores guardados y visibles
// ---------------------------------------------------------------------------------------------------------------

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' }
const MODE_LABELS: Record<string, string> = { major: 'Mayor', minor: 'Menor' }
const LEG_LABELS: Record<string, string> = { 'ii-v': 'II → V', 'v-i': 'V → I' }

/** Texto con el que el resumen muestra un contador guardado. */
export function labelOf(key: string): string {
  const [game, setId, third, fourth] = key.split(':') as [string, string, string, string]
  const set = SETS.find((item) => item.id === setId)!
  const place = `${set.drop} · ${set.set.toLowerCase()}`
  return game === 'recognition' ? `${place} · ${DIFFICULTY_LABELS[third]}` : `${place} · ${MODE_LABELS[third]} · ${LEG_LABELS[fourth]}`
}
export const counterText = ([correct, attempts]: [number, number]) =>
  attempts === 0 ? 'Sin intentos' : `${correct} de ${attempts} (${Math.round((100 * correct) / attempts)} %)`

export const stored = (page: Page, key: string) => page.evaluate((name) => localStorage.getItem(name), key)

/** Los contadores del documento guardado, tal como están en localStorage. */
export async function storedCounters(page: Page): Promise<Expected> {
  const raw = await stored(page, STORAGE_KEY)
  if (raw === null) return {}
  const doc = JSON.parse(raw) as { schemaVersion: number; progress: Record<string, { attempts: number; correct: number }> }
  expect(doc.schemaVersion).toBe(1)
  return Object.fromEntries(Object.entries(doc.progress).map(([key, counter]): [string, [number, number]] => [key, [counter.correct, counter.attempts]]))
}

/** Lo que muestra el resumen del menú: una línea por contador con intentos. */
export async function visibleCounters(page: Page): Promise<Record<string, string>> {
  const rows = await page
    .locator('.progreso details .progreso-lista li')
    .evaluateAll((items) => items.map((item) => [item.querySelector('span')!.textContent!, item.querySelector('strong')!.textContent!] as const))
  return Object.fromEntries(rows)
}

/**
 * Estando en el menú, comprueba que lo visible (líneas y totales por juego) y, si procede, lo guardado coinciden
 * con las cifras esperadas. Sin intentos se espera el texto de resumen vacío.
 */
export async function expectProgress(page: Page, expected: Expected, options: { persisted?: boolean } = {}) {
  const { persisted = true } = options
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
  const wanted = Object.fromEntries(Object.entries(expected).map(([key, counter]) => [labelOf(key), counterText(counter)]))
  await expect.poll(() => visibleCounters(page)).toEqual(wanted)

  const sum = (prefix: string): [number, number] =>
    Object.entries(expected)
      .filter(([key]) => key.startsWith(prefix))
      .reduce<[number, number]>((total, [, [correct, attempts]]) => [total[0] + correct, total[1] + attempts], [0, 0])
  const panel = page.locator('.progreso')
  if (Object.keys(expected).length === 0) {
    await expect(panel).toContainText('Todavía no has verificado ninguna pregunta')
  } else {
    await expect(panel).not.toContainText('Todavía no has verificado ninguna pregunta')
    await expect(panel.locator('dl div', { hasText: 'Reconocer voicings' }).locator('dd')).toHaveText(counterText(sum('recognition:')))
    await expect(panel.locator('dl div', { hasText: 'Rutas II-V-I' }).locator('dd')).toHaveText(counterText(sum('routes:')))
  }
  if (persisted) expect(await storedCounters(page)).toEqual(expected)
}

// ---------------------------------------------------------------------------------------------------------------
// Control de las APIs de almacenamiento del navegador
// ---------------------------------------------------------------------------------------------------------------

export interface StorageControl {
  /** Valores que se escriben en localStorage antes de que arranque la aplicación, solo en la primera carga de la pestaña. */
  items?: Record<string, string>
  /** localStorage lanza un error de seguridad al acceder a él, como con las cookies bloqueadas. */
  blocked?: boolean
  /** Escrituras de localStorage que lanzan «cuota superada»: todas ('*') o solo las de esas claves. */
  failWrites?: string[] | '*'
}

/**
 * Prepara solo las APIs del navegador, antes de cualquier script de la página y sin tocar la lógica de producción.
 * El script se ejecuta en cada carga, pero lo guardado se siembra una única vez por pestaña (lo recuerda
 * sessionStorage): recargar después no vuelve a inyectar el documento inicial. Los fallos de escritura también
 * viven en sessionStorage, así que se pueden levantar con setWriteFailures y siguen levantados al recargar.
 */
export async function controlStorage(page: Page, control: StorageControl) {
  await page.addInitScript((options) => {
    if (options.blocked) {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Acceso denegado por el navegador', 'SecurityError')
        },
      })
      return
    }
    if (sessionStorage.getItem('e2e:prepared') === null) {
      sessionStorage.setItem('e2e:prepared', '1')
      sessionStorage.setItem('e2e:fail', JSON.stringify(options.failWrites ?? []))
      for (const [key, value] of Object.entries(options.items ?? {})) localStorage.setItem(key, value)
    }
    const realSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (this === window.localStorage) {
        const failing = JSON.parse(sessionStorage.getItem('e2e:fail') ?? '[]') as string[] | '*'
        if (failing === '*' || failing.includes(key)) throw new DOMException('Cuota de almacenamiento superada', 'QuotaExceededError')
      }
      return realSetItem.call(this, key, value)
    }
  }, control)
}

/** Cambia en caliente qué escrituras fallan (por ejemplo [] para que el almacenamiento vuelva a funcionar). */
export const setWriteFailures = (page: Page, failing: string[] | '*') =>
  page.evaluate((value) => sessionStorage.setItem('e2e:fail', JSON.stringify(value)), failing)

export const storageNotice = (page: Page) => page.locator('.aviso[aria-label="Aviso sobre el almacenamiento"]')
