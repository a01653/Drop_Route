import { createHash } from 'node:crypto'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { FIGURES, VIEWPORTS } from './figures'
import type { Figure } from './figures'
import { resolveCaptureDir } from './output'

// Captura de cada figura y manifiesto con sus metadatos. Las imágenes son capturas reales de Chromium sobre el estado
// real de la aplicación: aquí no se oculta, mueve ni compone nada. Solo se espera a las fuentes, se suelta el foco y el
// puntero para que no quede ningún anillo ni resalte de ratón, y se recorta la región pedida.

/** Destino elegido: DROP_ROUTE_CAPTURE_OUTPUT o, sin ella, las entradas versionadas de docs/manuals/capturas. */
export const CAPTURES_DIR = resolveCaptureDir()
export const MANIFEST = 'capturas.json'

/** Altura máxima de una región recortada, en píxeles CSS: más sería una página entera, ilegible al imprimir. */
const MAX_REGION_HEIGHT = 2000
const MIN_REGION_HEIGHT = 120
const PADDING = 12
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Un tramo de la página: de la parte superior más alta de `from` a la inferior más baja de `to` (cada uno puede ser una lista de selectores, para las disposiciones en columnas), o el viewport. */
export type Region = { from: string; to: string } | 'viewport'

interface Entry {
  id: string
  file: string
  title: string
  game: string
  state: string
  viewport: { kind: string; width: number; height: number; deviceScaleFactor: number }
  region: { kind: 'viewport' } | { kind: 'tramo'; from: string; to: string; cssHeight: number }
  observed: Record<string, string>
  pixels: { width: number; height: number }
  bytes: number
  sha256: string
}

/** Dimensiones de un PNG leídas de su cabecera IHDR. */
export function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE), 'cabecera PNG').toBe(true)
  expect(bytes.subarray(12, 16).toString('latin1'), 'primer bloque PNG').toBe('IHDR')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Fuentes cargadas, un par de fotogramas sin animaciones pendientes, sin foco ni puntero encima de nada. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))
  })
  const failed = await page.evaluate(() => {
    const families: string[] = []
    document.fonts.forEach((font) => {
      if (font.status === 'error') families.push(font.family)
    })
    return families
  })
  expect(failed, 'fuentes que no se pudieron cargar').toEqual([])
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
  await page.mouse.move(0, 0)
}

/** Lo que la propia interfaz declara en este momento, para que los metadatos no dependan de lo que el test crea. */
async function observe(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const observed: Record<string, string> = {}
    const main = document.querySelector('main')
    if (main?.getAttribute('data-phase')) observed.fase = main.getAttribute('data-phase')!
    const heading = document.querySelector('h1')?.textContent?.trim()
    if (heading) observed.titulo = heading
    const header = document.querySelector('.juego-cabecera p')?.textContent?.trim()
    if (header) observed.cabecera = header
    const pressed = Array.from(document.querySelectorAll('.menu-formulario [aria-pressed="true"]')).map(
      (item) => item.textContent?.trim().replace(/\s+/g, ' ') ?? '',
    )
    if (pressed.length > 0) observed.pulsados = pressed.join(' | ')
    return observed
  })
}

export class Recorder {
  private readonly entries = new Map<string, Entry>()

  constructor(
    private readonly dir: string,
    private readonly browser: { name: string; version: string },
  ) {}

  /** Vacía de this.dir (el destino elegido, nunca otro) los PNG y el manifiesto de una ejecución anterior; conserva el README. */
  async prepare() {
    await mkdir(this.dir, { recursive: true })
    for (const name of await readdir(this.dir)) {
      if (name.endsWith('.png') || name === MANIFEST) await rm(join(this.dir, name))
    }
  }

  async shoot(page: Page, id: string, region: Region) {
    const figure: Figure | undefined = FIGURES.find((item) => item.id === id)
    expect(figure, `figura ${id} del contrato`).toBeDefined()
    expect(this.entries.has(id), `figura ${id} repetida`).toBe(false)
    const { title, game, state, viewport: kind } = figure!
    const viewport = VIEWPORTS[kind]
    expect(page.viewportSize(), `viewport de ${id}`).toEqual({ width: viewport.width, height: viewport.height })

    await settle(page)
    const observed = await observe(page)
    let bytes: Buffer
    let cssHeight: number
    if (region === 'viewport') {
      bytes = await page.screenshot({ animations: 'disabled', caret: 'hide' })
      cssHeight = viewport.height
    } else {
      const top = await page.locator(region.from).evaluateAll((elements) => Math.min(...elements.map((element) => element.getBoundingClientRect().top + window.scrollY)))
      const bottom = await page.locator(region.to).evaluateAll((elements) => Math.max(...elements.map((element) => element.getBoundingClientRect().bottom + window.scrollY)))
      const sheet = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(sheet.scrollWidth, `${id}: sin desplazamiento horizontal`).toBeLessThanOrEqual(sheet.width)
      const y = Math.max(0, Math.floor(top - PADDING))
      cssHeight = Math.min(sheet.height, Math.ceil(bottom + PADDING)) - y
      expect(cssHeight, `${id}: región mínima`).toBeGreaterThanOrEqual(MIN_REGION_HEIGHT)
      expect(cssHeight, `${id}: región de ${cssHeight} px CSS, más que una sección legible al imprimir`).toBeLessThanOrEqual(MAX_REGION_HEIGHT)
      bytes = await page.screenshot({ fullPage: true, clip: { x: 0, y, width: viewport.width, height: cssHeight }, animations: 'disabled', caret: 'hide' })
    }

    const pixels = pngSize(bytes)
    expect(pixels.width, `${id}: ancho en píxeles`).toBe(viewport.width * viewport.deviceScaleFactor)
    expect(Math.abs(pixels.height - cssHeight * viewport.deviceScaleFactor), `${id}: alto en píxeles`).toBeLessThanOrEqual(2)
    expect(bytes.length, `${id}: una captura vacía o en blanco pesa muy poco`).toBeGreaterThan(5_000)

    const file = `${id}.png`
    await writeFile(join(this.dir, file), bytes)
    this.entries.set(id, {
      id,
      file,
      title,
      game,
      state,
      viewport: { kind, ...viewport },
      region: region === 'viewport' ? { kind: 'viewport' } : { kind: 'tramo', from: region.from, to: region.to, cssHeight },
      observed,
      pixels,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }

  /** Comprueba que están todas las figuras del contrato, ni más ni menos, y escribe el manifiesto. */
  async finish() {
    expect([...this.entries.keys()].sort(), 'figuras capturadas frente al contrato').toEqual(FIGURES.map((item) => item.id).sort())
    const manifest = {
      schema: 1,
      generatedBy: 'npm run docs:captures',
      browser: this.browser,
      commit: process.env.GITHUB_SHA ?? null,
      captures: FIGURES.map((item) => this.entries.get(item.id)!),
    }
    await writeFile(join(this.dir, MANIFEST), JSON.stringify(manifest, null, 2) + '\n')
    const files = (await readdir(this.dir)).filter((name) => name.endsWith('.png')).sort()
    expect(files, 'PNG en la carpeta').toEqual(FIGURES.map((item) => `${item.id}.png`).sort())
  }
}
