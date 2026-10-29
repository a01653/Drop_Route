import type { ScaleDefinition, ScaleDegree, ScaleId, ScalePattern } from '../data/types'

const mod12 = (value: number) => ((value % 12) + 12) % 12

/**
 * Grados que se marcan en Difícil y se colorean en estudio: tónica, tercera, quinta y séptima.
 * La pentatónica mayor no tiene séptima y usa la sexta, como C6 en los voicings.
 */
export const SCALE_TARGET_DEGREES: Readonly<Record<ScaleId, readonly ScaleDegree[]>> = {
  major: ['1', '3', '5', '7'],
  'major-pentatonic': ['1', '3', '5', '6'],
  'minor-pentatonic': ['1', 'b3', '5', 'b7'],
  'natural-minor': ['1', 'b3', '5', 'b7'],
}

/** Patrón colocado en una tonalidad: las mismas notas y grados, desplazados todos igual. */
export interface PlacedPattern extends ScalePattern {
  tonicPc: number
  /** Trastes sumados a la posición fuente en C. */
  shift: number
  lowFret: number
  highFret: number
}

/**
 * Lleva un patrón de C a la tonalidad elegida desplazando todas sus notas la misma cantidad y lo sitúa en
 * su posición más grave sin trastes negativos (traste más grave entre 0 y 11). No cambia la digitación.
 */
export function patternInKey(pattern: ScalePattern, tonicPc: number, sourceTonicPc = 0): PlacedPattern {
  const sourceLow = Math.min(...pattern.notes.map((note) => note.fret))
  let shift = mod12(tonicPc - sourceTonicPc)
  while (sourceLow + shift > 11) shift -= 12
  while (sourceLow + shift < 0) shift += 12
  const notes = pattern.notes.map((note) => ({ ...note, fret: note.fret + shift }))
  const frets = notes.map((note) => note.fret)
  return {
    ...pattern,
    notes,
    tonicPc: mod12(tonicPc),
    shift,
    lowFret: Math.min(...frets),
    highFret: Math.max(...frets),
  }
}

/** Los cinco patrones de una escala en la tonalidad elegida, en el orden de su numeración. */
export function patternsInKey(scale: ScaleDefinition, tonicPc: number, sourceTonicPc = 0): PlacedPattern[] {
  return scale.patterns.map((pattern) => patternInKey(pattern, tonicPc, sourceTonicPc))
}

/** Orden de grave a agudo por el mástil: depende de la tonalidad, porque cambia qué patrón queda más abajo. */
export function neckOrder(patterns: readonly PlacedPattern[]): PlacedPattern[] {
  return [...patterns].sort((a, b) => a.lowFret - b.lowFret)
}
