import type { Degree, QualityKey } from '../../data'

// Colores de references/laminas-drop-original.html (ver docs/VISUAL.md).
export const INK = '#14183A'
export const PAPER = '#FFFFFF'
export const STRING_NUMBER_COLOR = '#1B2A78'
export const SECONDARY_COLOR = '#5C6AB0'
export const REFERENCE_COLORS = { fill: '#DFE1EA', text: '#9AA3C9' } as const

export type DegreeFunction = 'root' | 'third' | 'fifth' | 'seventh'

export const DEGREE_COLORS: Record<DegreeFunction, { fill: string; text: string }> = {
  root: { fill: '#E11D48', text: PAPER },
  third: { fill: '#0284C7', text: PAPER },
  fifth: { fill: '#059669', text: PAPER },
  seventh: { fill: '#EDBC07', text: '#3D2F00' },
}

/** El color depende de la función del grado, no de su alteración: b3 es tercera y b5 es quinta. */
export function degreeFunction(degree: Degree): DegreeFunction {
  switch (degree) {
    case '1':
      return 'root'
    case '3':
    case 'b3':
      return 'third'
    case '5':
    case 'b5':
      return 'fifth'
    case '6':
    case '7':
    case 'b7':
    case 'bb7':
      return 'seventh'
  }
}

/** Fondo y borde de la tarjeta en la vista de solución. Solo la solución conoce la calidad. */
export const QUALITY_COLORS: Record<QualityKey, { background: string; border: string; family: string }> = {
  maj7: { background: '#EAF4FE', border: '#A6CBE9', family: 'MAYOR 7' },
  '7': { background: '#E7F8F3', border: '#93D6C4', family: 'DOMINANTE 7' },
  m7: { background: '#EFEAFC', border: '#BFB1E8', family: 'MENOR 7' },
  m7b5: { background: '#FDF6E2', border: '#E6CD92', family: 'SEMIDISMINUIDO' },
  // Referencia: la plantilla no le da fondo propio y no se ofrece en preguntas.
  dim7: { background: '#EEF0F6', border: '#C9CFE0', family: 'DISMINUIDO 7' },
}

/** Vista neutra: mismo fondo, mismo borde y mismos círculos grises para cualquier forma. */
export const NEUTRAL_COLORS = {
  background: '#F4F6FB',
  border: '#CFD5E8',
  dotFill: '#C8CDE0',
  dotStroke: '#6D7699',
} as const
