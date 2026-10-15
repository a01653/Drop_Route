import type { ChordShape, QualityKey, StringNumber } from '../data'

export interface TonalityOption {
  pc: number
  label: string
}

export const TONALITIES: readonly TonalityOption[] = [
  { pc: 0, label: 'C' },
  { pc: 1, label: 'D♭' },
  { pc: 2, label: 'D' },
  { pc: 3, label: 'E♭' },
  { pc: 4, label: 'E' },
  { pc: 5, label: 'F' },
  { pc: 6, label: 'G♭' },
  { pc: 7, label: 'G' },
  { pc: 8, label: 'A♭' },
  { pc: 9, label: 'A' },
  { pc: 10, label: 'B♭' },
  { pc: 11, label: 'B' },
]

const QUALITY_SUFFIX: Record<QualityKey, string> = {
  maj7: 'maj7',
  '7': '7',
  m7: 'm7',
  m7b5: 'm7(♭5)',
  dim7: 'dim7',
}

const mod12 = (value: number) => ((value % 12) + 12) % 12

export function noteName(pc: number): string {
  return TONALITIES.find((item) => item.pc === mod12(pc))?.label ?? 'C'
}

export function chordName(rootPc: number, quality: QualityKey): string {
  return `${noteName(rootPc)}${QUALITY_SUFFIX[quality]}`
}

/**
 * Desplazamiento físico desde C a la tonalidad elegida. Se prefiere el movimiento cromático más corto
 * (-6..+5 semitonos); si alguna nota caería por debajo del traste 0, se usa la misma tonalidad una octava arriba.
 */
export function commonFretShift(shapes: readonly ChordShape[], tonicPc: number): number {
  let shift = ((mod12(tonicPc) + 6) % 12) - 6
  const minFret = Math.min(...shapes.flatMap((shape) => shape.notes.map((note) => note.fret)))
  if (minFret + shift < 0) shift += 12
  return shift
}

export type NamedShape = ChordShape & { name: string; root: string }

/** Conserva el dibujo y los grados y desplaza todas las voces la misma cantidad de semitonos. */
export function transposeShape<T extends NamedShape>(shape: T, shift: number): T {
  const rootPc = mod12(shape.rootPc + shift)
  return {
    ...shape,
    rootPc,
    root: noteName(rootPc),
    name: chordName(rootPc, shape.quality),
    notes: shape.notes.map((note) => ({ ...note, fret: note.fret + shift })),
  }
}

export function transposeShapes<T extends NamedShape>(shapes: readonly T[], tonicPc: number): { shift: number; shapes: T[] } {
  const shift = commonFretShift(shapes, tonicPc)
  return { shift, shapes: shapes.map((shape) => transposeShape(shape, shift)) }
}

export interface VoiceMovement {
  string: StringNumber
  fromFret: number
  toFret: number
  delta: number
}

/** Movimiento cromático por voz, emparejando cada cuerda del set consigo misma. */
export function voiceMovement(from: ChordShape, to: ChordShape): VoiceMovement[] {
  return from.notes.map((source) => {
    const target = to.notes.find((note) => note.string === source.string)
    if (!target) throw new Error(`La cuerda ${source.string} no existe en el acorde de destino`)
    return {
      string: source.string,
      fromFret: source.fret,
      toFret: target.fret,
      delta: target.fret - source.fret,
    }
  })
}

export function totalVoiceMovement(from: ChordShape, to: ChordShape): number {
  return voiceMovement(from, to).reduce((total, voice) => total + Math.abs(voice.delta), 0)
}

export function movementText(delta: number): string {
  if (delta === 0) return 'se mantiene'
  if (delta === 1) return 'sube 1 semitono'
  if (delta === -1) return 'baja 1 semitono'
  return delta > 0 ? `sube ${delta} semitonos` : `baja ${Math.abs(delta)} semitonos`
}
