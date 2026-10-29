// Tipos de data/catalog.json, data/routes.json y data/scales.json. Los JSON son la única
// definición de datos; aquí solo se describe su forma.

export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6
export type QualityKey = 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7'
export type Degree = '1' | '3' | 'b3' | '5' | 'b5' | '6' | '7' | 'b7' | 'bb7'
export type Inversion = 0 | 1 | 2 | 3
export type DropFamily = 'drop2' | 'drop3' | 'drop2+4'
export type SetId = 'D2S1' | 'D2S2' | 'D2S3' | 'D3S1' | 'D3S2' | 'D24S1' | 'D24S2'

export interface NotePosition {
  string: StringNumber
  fret: number
  degree: Degree
}

export interface SetDefinition {
  id: SetId
  drop: DropFamily
  number: number
  /** Cuerdas desde la más grave. */
  strings: StringNumber[]
}

export interface Quality {
  name: string
  /** Semitonos desde la raíz. */
  formula: number[]
  degrees: Degree[]
  quizEnabled?: boolean
}

/** Forma mínima común a las posiciones del catálogo y a los pasos de ruta. */
export interface ChordShape {
  setId: SetId
  quality: QualityKey
  rootPc: number
  inversion: Inversion
  notes: NotePosition[]
  /** Columna de referencia de la plantilla; solo se añade a copias derivadas para estudio. */
  anchorFret?: number
  /** Notas grises en formas derivadas de estudio o preguntas; no son voces que se toquen. */
  referenceNotes?: NotePosition[]
}

export interface Voicing extends ChordShape {
  id: string
  root: string
  name: string
  quizEnabled: boolean
}

export interface Catalog {
  schemaVersion: number
  source: string
  sourceSha256: string
  sourceDocumentVersion: string
  /** MIDI de la cuerda al aire. */
  tuning: Record<StringNumber, number>
  sets: SetDefinition[]
  qualities: Record<QualityKey, Quality>
  inversions: string[]
  voicings: Voicing[]
}

export type RouteFunction = 'ii' | 'V' | 'I'

export interface RouteStep extends ChordShape {
  function: RouteFunction
  name: string
  root: string
  /** Sustitución opcional citada en la fuente (por ejemplo C6); no es evaluable. */
  sourceOptionalSubstitution?: string
}

export interface Route {
  id: string
  setId: SetId
  tonic: string
  mode: 'major' | 'minor'
  sourceConstant: string
  steps: RouteStep[]
}

export interface RoutesDocument {
  schemaVersion: number
  source: string
  sourceSha256: string
  sourceDocumentVersion: string
  routes: Route[]
}

// Tipos de data/scales.json: cinco patrones por escala, transcritos en C de la fuente citada.
export type ScaleId = 'major' | 'major-pentatonic' | 'minor-pentatonic' | 'natural-minor'
export type ScaleDegree = '1' | '2' | 'b3' | '3' | '4' | '5' | 'b6' | '6' | 'b7' | '7'
export type PatternNumber = 1 | 2 | 3 | 4 | 5

export interface ScaleNote {
  string: StringNumber
  fret: number
  degree: ScaleDegree
}

export interface ScalePattern {
  id: string
  /** Convención acordada: 1=E, 2=D, 3=C, 4=A y 5=G (en las menores, Em…Gm). */
  number: PatternNumber
  caged: string
  /** Traste más grave que indica la fuente para esta posición en C. */
  sourcePosition: number
  sourceDiagram: { url: string; sha256: string; sizeBytes: number }
  /** Cuerdas de la 6 a la 1 y, en cada cuerda, trastes ascendentes. */
  notes: ScaleNote[]
}

export interface ScaleDefinition {
  id: ScaleId
  name: string
  source: string
  /** Semitonos desde la tónica. */
  formula: number[]
  degrees: ScaleDegree[]
  patterns: ScalePattern[]
}

export interface ScaleSource {
  id: string
  title: string
  url: string
  publisher: string
  consultedAt: string
}

export interface ScalesDocument {
  schemaVersion: number
  tonic: string
  tonicPc: number
  tuning: Record<StringNumber, number>
  numbering: string
  sources: ScaleSource[]
  scales: ScaleDefinition[]
}
