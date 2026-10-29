import type { StringNumber } from '../../data'
import {
  AREA_X,
  AREA_Y,
  CARD_HEIGHT,
  CARD_RIGHT_MARGIN,
  DOT_DIAMETER,
  FRET_NUMBER_Y,
  FRET_WIDTH,
  MIN_COLUMNS,
  NUT_WIDTH,
  STRING_COUNT,
  STRING_GAP,
  STRING_NUMBER_X,
  stringY,
} from './geometry'
import type { DotGeometry, FretWindow, PositionNote } from './geometry'

/** Hueco a la izquierda del cejuelo para las cuerdas al aire de un patrón que empieza en el traste 0. */
export const OPEN_WIDTH = 26

export interface ScaleCardLayout {
  width: number
  height: number
  /** Comienzo de la zona de trastes: después del hueco de cuerdas al aire, si lo hay. */
  areaX: number
  areaWidth: number
  areaHeight: number
  window: FretWindow
  fretLines: number[]
  stringLines: { y: number; x1: number; x2: number }[]
  nut: { x: number; y: number; width: number; height: number } | null
  stringNumbers: { string: StringNumber; x: number; y: number }[]
  fretNumbers: { fret: number; x: number; y: number }[]
  dots: DotGeometry[]
}

export interface ScaleCardOptions {
  /** Sin números de traste ni cejuelo: la tarjeta no dice en qué zona del mástil está. */
  showFrets?: boolean
  /** Columnas mínimas, comunes a las tarjetas que se comparan para que todas tengan la misma escala. */
  columns?: number
  /** Reserva el hueco de cuerdas al aire aunque este patrón no lo use, por la misma razón. */
  reserveOpen?: boolean
}

/** Columnas que ocupa un patrón: desde el traste 1 si usa cuerdas al aire, desde su traste más grave si no. */
export function scaleColumns(notes: PositionNote[]): number {
  const frets = notes.map((note) => note.fret)
  const low = Math.min(...frets)
  return Math.max(...frets) - (low === 0 ? 1 : low) + 1
}

/**
 * Tramo corto del mástil para un patrón de escala, con las proporciones de las tarjetas de voicings:
 * seis cuerdas, varias notas por cuerda y, si el patrón usa cuerdas al aire, el cejuelo con esas notas
 * a su izquierda. Al ocultar los trastes no se dibujan ni números ni cejuelo.
 */
export function layoutScaleCard(
  notes: PositionNote[],
  { showFrets = true, columns = MIN_COLUMNS, reserveOpen = false }: ScaleCardOptions = {},
): ScaleCardLayout {
  const frets = notes.map((note) => note.fret)
  const low = Math.min(...frets)
  const high = Math.max(...frets)
  const open = showFrets && low === 0
  const start = open ? 1 : low
  const window = { start, count: Math.max(MIN_COLUMNS, columns, high - start + 1) }
  const areaX = AREA_X + (showFrets && (open || reserveOpen) ? OPEN_WIDTH : 0)
  const areaWidth = window.count * FRET_WIDTH + 1
  const areaHeight = (STRING_COUNT - 1) * STRING_GAP + 1
  const strings = [1, 2, 3, 4, 5, 6] as StringNumber[]
  return {
    width: areaX + areaWidth + CARD_RIGHT_MARGIN,
    height: CARD_HEIGHT,
    areaX,
    areaWidth,
    areaHeight,
    window,
    fretLines: Array.from({ length: window.count + 1 }, (_, i) => areaX + i * FRET_WIDTH),
    stringLines: strings.map((string) => ({ y: stringY(string), x1: AREA_X, x2: areaX + areaWidth })),
    nut: showFrets && start === 1 ? { x: areaX - NUT_WIDTH / 2, y: AREA_Y - 2, width: NUT_WIDTH, height: areaHeight + 3 } : null,
    stringNumbers: strings.map((string) => ({ string, x: STRING_NUMBER_X, y: stringY(string) + 4 })),
    fretNumbers: showFrets
      ? Array.from({ length: window.count }, (_, i) => ({ fret: start + i, x: areaX + i * FRET_WIDTH + FRET_WIDTH / 2, y: FRET_NUMBER_Y }))
      : [],
    dots: notes.map((note) => ({
      ...note,
      cx: note.fret === 0 && open ? areaX - OPEN_WIDTH / 2 - 2 : areaX + (note.fret - start) * FRET_WIDTH + FRET_WIDTH / 2,
      cy: stringY(note.string),
      r: DOT_DIAMETER / 2,
    })),
  }
}
