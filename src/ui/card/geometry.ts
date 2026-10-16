import type { Catalog, SetId, StringNumber } from '../../data'

// Proporciones de references/laminas-drop-original.html (docs/VISUAL.md):
// traste 44, separación de cuerdas 20, círculo de 18 y cejuelo de 5.
export const FRET_WIDTH = 44
export const STRING_GAP = 20
export const DOT_DIAMETER = 18
export const NUT_WIDTH = 5
export const MIN_COLUMNS = 5
export const STRING_COUNT = 6

// Marco de la tarjeta: la zona del mástil (área) y los márgenes que la rodean.
export const AREA_X = 32
export const AREA_Y = 36
export const CARD_HEIGHT = 166
export const CARD_RIGHT_MARGIN = 11
export const STRING_NUMBER_X = AREA_X - 14
export const FRET_NUMBER_Y = AREA_Y + 124

/** Columnas de trastes visibles: el primer traste y cuántos se dibujan. */
export interface FretWindow {
  start: number
  count: number
}

/** Una nota situada solo por su cuerda y traste: es lo único que sabe la vista neutra. */
export interface PositionNote {
  string: StringNumber
  fret: number
}

export interface DotGeometry extends PositionNote {
  cx: number
  cy: number
  r: number
}

export interface CardLayout {
  width: number
  height: number
  areaWidth: number
  areaHeight: number
  fretLines: number[]
  stringLines: number[]
  nut: { x: number; y: number; width: number; height: number } | null
  stringNumbers: { string: StringNumber; x: number; y: number }[]
  fretNumbers: { fret: number; x: number; y: number }[]
  muteMarks: { string: StringNumber; cx: number; cy: number }[]
  dots: DotGeometry[]
}

export const stringY = (string: number): number => AREA_Y + (string - 1) * STRING_GAP

/**
 * Grupos de set e inversión en los que la plantilla dibuja la sustitución opcional C6 sobre el Cmaj7: la
 * séptima mayor bajada dos trastes en su cuerda. Los datos canónicos conservan maj7; la plantilla
 * cuenta también el traste de la sexta al calcular la ventana (columnStart). Solo cambia
 * la ventana de D24S1 inversión 3, que empieza en el traste 12 y no en el 13; en los otros ocho grupos la
 * sexta no queda por debajo de las demás notas. Lista leída de la plantilla: el E2E la compara con su DOM.
 */
export const TEMPLATE_C6_GROUPS: readonly { setId: SetId; inversion: number }[] = [
  { setId: 'D2S1', inversion: 3 },
  { setId: 'D2S2', inversion: 3 },
  { setId: 'D2S3', inversion: 3 },
  { setId: 'D3S1', inversion: 3 },
  { setId: 'D3S2', inversion: 3 },
  { setId: 'D24S1', inversion: 1 },
  { setId: 'D24S1', inversion: 3 },
  { setId: 'D24S2', inversion: 1 },
  { setId: 'D24S2', inversion: 3 },
]
/** La sexta de C6 sustituye a la séptima mayor dos trastes más abajo (un tono). */
const C6_FRET_DROP = 2

/**
 * Ventana común a las cuatro calidades de un set e inversión, como en la plantilla
 * (columnStart): empieza en el traste más bajo del grupo, contando la sexta de C6 en los grupos de
 * TEMPLATE_C6_GROUPS, tanto con datos canónicos como con formas derivadas. Las tarjetas comparten fondo y
 * numeración, y la ventana no depende de la calidad contestada. Se amplía por encima de cinco trastes si el
 * grupo lo necesitara.
 */
export function groupWindow(catalog: Catalog, setId: SetId, inversion: number): FretWindow {
  const members = catalog.voicings.filter(
    (voicing) => voicing.quizEnabled && voicing.setId === setId && voicing.inversion === inversion,
  )
  const frets = members.flatMap((voicing) => voicing.notes.map((note) => note.fret))
  if (frets.length === 0) throw new Error(`No hay formas evaluables en ${setId} inversión ${inversion}`)
  const start = Math.min(...frets)
  const seventh = TEMPLATE_C6_GROUPS.some((group) => group.setId === setId && group.inversion === inversion)
    ? members.find((voicing) => voicing.quality === 'maj7')?.notes.find((note) => note.degree === '7')
    : undefined
  const windowStart = seventh ? Math.min(start, seventh.fret - C6_FRET_DROP) : start
  return { start: windowStart, count: Math.max(MIN_COLUMNS, Math.max(...frets) - windowStart + 1) }
}

const signature = (notes: PositionNote[]) => notes.map((note) => `${note.string}:${note.fret}`).join(',')

/**
 * Ventana de una posición física. Si es una forma del catálogo, la de su grupo; si no, la mínima que la
 * contiene. Solo depende de cuerdas y trastes, nunca de la inversión o la calidad declaradas, de modo que
 * la vista neutra no puede llevar más información que la propia posición.
 */
export function windowForPosition(catalog: Catalog, setId: SetId, notes: PositionNote[]): FretWindow {
  const wanted = signature(notes)
  const known = catalog.voicings.find(
    (voicing) => voicing.quizEnabled && voicing.setId === setId && signature(voicing.notes) === wanted,
  )
  if (known) return groupWindow(catalog, setId, known.inversion)
  const frets = notes.map((note) => note.fret)
  const start = Math.min(...frets)
  return { start, count: Math.max(MIN_COLUMNS, Math.max(...frets) - start + 1) }
}

export function layoutCard(notes: PositionNote[], setStrings: StringNumber[], window: FretWindow): CardLayout {
  const areaWidth = window.count * FRET_WIDTH + 1
  const areaHeight = (STRING_COUNT - 1) * STRING_GAP + 1
  const dots = notes.map((note) => {
    const column = note.fret - window.start
    if (column < 0 || column >= window.count) {
      throw new Error(`El traste ${note.fret} queda fuera de la ventana ${window.start}-${window.start + window.count - 1}`)
    }
    return {
      ...note,
      cx: AREA_X + column * FRET_WIDTH + FRET_WIDTH / 2,
      cy: stringY(note.string),
      r: DOT_DIAMETER / 2,
    }
  })
  const strings = [1, 2, 3, 4, 5, 6] as StringNumber[]
  return {
    width: AREA_X + areaWidth + CARD_RIGHT_MARGIN,
    height: CARD_HEIGHT,
    areaWidth,
    areaHeight,
    fretLines: Array.from({ length: window.count + 1 }, (_, i) => AREA_X + i * FRET_WIDTH),
    stringLines: strings.map(stringY),
    nut: window.start === 1 ? { x: AREA_X - NUT_WIDTH / 2, y: AREA_Y - 2, width: NUT_WIDTH, height: areaHeight + 3 } : null,
    stringNumbers: strings.map((string) => ({ string, x: STRING_NUMBER_X, y: stringY(string) + 4 })),
    fretNumbers: Array.from({ length: window.count }, (_, i) => ({
      fret: window.start + i,
      x: AREA_X + i * FRET_WIDTH + FRET_WIDTH / 2,
      y: FRET_NUMBER_Y,
    })),
    muteMarks: strings
      .filter((string) => !setStrings.includes(string))
      .map((string) => ({ string, cx: AREA_X, cy: stringY(string) })),
    dots,
  }
}
