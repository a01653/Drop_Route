// Tipos de data/catalog.json y data/routes.json. Los JSON son la única
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
