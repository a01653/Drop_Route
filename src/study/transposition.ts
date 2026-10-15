import type { ChordShape, QualityKey, RouteFunction, RouteStep, SetId, StringNumber } from '../data'

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

/** Escritura funcional de I, ii y V para cada tonalidad elegida. */
const ROUTE_ROOTS: Readonly<Record<number, Readonly<Record<RouteFunction, string>>>> = {
  0: { I: 'C', ii: 'D', V: 'G' },
  1: { I: 'D♭', ii: 'E♭', V: 'A♭' },
  2: { I: 'D', ii: 'E', V: 'A' },
  3: { I: 'E♭', ii: 'F', V: 'B♭' },
  4: { I: 'E', ii: 'F♯', V: 'B' },
  5: { I: 'F', ii: 'G', V: 'C' },
  6: { I: 'G♭', ii: 'A♭', V: 'D♭' },
  7: { I: 'G', ii: 'A', V: 'D' },
  8: { I: 'A♭', ii: 'B♭', V: 'E♭' },
  9: { I: 'A', ii: 'B', V: 'E' },
  10: { I: 'B♭', ii: 'C', V: 'F' },
  11: { I: 'B', ii: 'C♯', V: 'F♯' },
}

const DROP24_SETS: ReadonlySet<SetId> = new Set(['D24S1', 'D24S2'])

const mod12 = (value: number) => ((value % 12) + 12) % 12

export function noteName(pc: number): string {
  return TONALITIES.find((item) => item.pc === mod12(pc))?.label ?? 'C'
}

export function chordName(rootPc: number, quality: QualityKey): string {
  return `${noteName(rootPc)}${QUALITY_SUFFIX[quality]}`
}

export function routeRootName(tonicPc: number, functionName: RouteFunction): string {
  return ROUTE_ROOTS[mod12(tonicPc)]?.[functionName] ?? noteName(tonicPc)
}

export function routeChordName(tonicPc: number, functionName: RouteFunction, quality: QualityKey): string {
  return `${routeRootName(tonicPc, functionName)}${QUALITY_SUFFIX[quality]}`
}

/**
 * Desplazamiento físico desde C a la tonalidad elegida. Se prefiere el movimiento cromático más corto
 * (-6..+5 semitonos); si alguna nota caería por debajo del traste 0, se usa la misma tonalidad una octava arriba.
 */
export function commonFretShift(shapes: readonly ChordShape[], tonicPc: number): number {
  if (shapes.length === 0) return 0
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

/**
 * La lámina original muestra C6 como lectura alternativa de Cmaj7 bajando la 7ª mayor dos trastes.
 * En voicings aparece en todas las terceras inversiones y, en Drop 2+4, también en la primera.
 * Es una transformación exclusiva del modo estudio: los JSON y los juegos evaluables siguen intactos.
 */
export function usesSourceSixth(shape: ChordShape): boolean {
  return shape.quality === 'maj7' && (shape.inversion === 3 || (shape.inversion === 1 && DROP24_SETS.has(shape.setId)))
}

function withSixthAlternative<T extends NamedShape>(shape: T, enabled: boolean): T {
  if (!enabled) return shape
  return {
    ...shape,
    name: `${shape.name} – ${shape.root}6`,
    notes: shape.notes.map((note) =>
      note.degree === '7' ? { ...note, fret: note.fret - 2, degree: '6' as const } : note,
    ),
  }
}

/** Transpone una forma de estudio y conserva, cuando corresponde, la variante C6 de la fuente. */
export function transposeStudyVoicing<T extends NamedShape>(shape: T, tonicPc: number): { shift: number; shape: T } {
  const showSixth = usesSourceSixth(shape)
  const sourceShape = withSixthAlternative(shape, showSixth)
  const shift = commonFretShift([sourceShape], tonicPc)
  return { shift, shape: withSixthAlternative(transposeShape(shape, shift), showSixth) }
}

/** Transpone una ruta y corrige la grafía de I, ii y V según la tonalidad elegida. */
export function transposeRoute(steps: readonly RouteStep[], tonicPc: number): { shift: number; shapes: RouteStep[] } {
  const sourceSteps = steps.map((step) => withSixthAlternative(step, step.sourceOptionalSubstitution === 'C6'))
  const shift = commonFretShift(sourceSteps, tonicPc)
  return {
    shift,
    shapes: sourceSteps.map((sourceStep) => {
      const step = transposeShape(sourceStep, shift)
      const root = routeRootName(tonicPc, step.function)
      const name = routeChordName(tonicPc, step.function, step.quality)
      return {
        ...step,
        root,
        name: sourceStep.sourceOptionalSubstitution === 'C6' ? `${name} – ${root}6` : name,
      }
    }),
  }
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
