import type { Degree, ScaleDegree } from '../../data'
import './card.css'
import { DegreeLabel } from './FretboardCard'
import { AREA_X, AREA_Y } from './geometry'
import type { PositionNote } from './geometry'
import { spokenDegree } from './model'
import { DEGREE_COLORS, INK, NEUTRAL_COLORS, PAPER, QUALITY_COLORS, SECONDARY_COLOR, STRING_NUMBER_COLOR, degreeFunction } from './palette'
import { layoutScaleCard } from './scaleLayout'
import type { ScaleCardOptions } from './scaleLayout'

interface SolutionProps {
  view: 'solution'
  notes: (PositionNote & { degree: ScaleDegree })[]
  /** Título manuscrito de la tarjeta, por ejemplo «Patrón 1». */
  name: string
  /** Rótulo pequeño a la derecha, por ejemplo «FORMA E». */
  family: string
  /** Grados que llevan color musical; el resto de notas de la escala se dibujan en blanco. */
  targets: readonly ScaleDegree[]
  minor: boolean
  /** Descripción accesible: escala, tonalidad y patrón. Se completa con las notas y sus grados. */
  label: string
  layout?: ScaleCardOptions
}

interface NeutralProps {
  view: 'neutral'
  /** Solo posiciones: la vista de pregunta no recibe grados, nombre ni escala. */
  notes: PositionNote[]
  layout?: ScaleCardOptions
}

export type ScalePatternCardProps = SolutionProps | NeutralProps

/** Notas de la escala que no son tónica, tercera, quinta ni séptima (o sexta): círculo blanco con trazo. */
const PASSING = { fill: PAPER, stroke: SECONDARY_COLOR, text: INK } as const

/**
 * Patrón de escala sobre un tramo corto del mástil, con la apariencia de las tarjetas de voicings. La vista
 * neutra solo conoce posiciones: círculos grises sobre el fondo común, sin grados, nombre ni colores. La de
 * solución añade el título, los grados y los colores musicales, con el fondo de la familia mayor o menor.
 */
export function ScalePatternCard(props: ScalePatternCardProps) {
  const layout = layoutScaleCard(props.notes, props.layout)
  const solution = props.view === 'solution' ? props : null
  const colors = solution ? (solution.minor ? QUALITY_COLORS.m7 : QUALITY_COLORS.maj7) : NEUTRAL_COLORS
  // Sin trastes, el nombre accesible tampoco los dice: solo la columna dentro de la tarjeta, que es la pregunta.
  const hidden = props.layout?.showFrets === false
  const low = Math.min(...props.notes.map((note) => note.fret))
  const positions = props.notes.map((note) =>
    hidden ? `cuerda ${note.string}, columna ${note.fret - low + 1}` : `cuerda ${note.string}, traste ${note.fret}`,
  )
  const label = solution
    ? `${solution.label}: ${solution.notes.map((note, i) => `${positions[i]}, grado ${spokenDegree(note.degree as Degree)}`).join('; ')}.`
    : `Patrón de ${props.notes.length} notas: ${positions.join('; ')}.`

  return (
    <svg
      className="fretboard-card scale-card"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <rect
        className="card-background"
        x={0.9}
        y={0.9}
        width={layout.width - 1.8}
        height={layout.height - 1.8}
        rx={14}
        fill={colors.background}
        stroke={colors.border}
        strokeWidth={1.8}
      />
      {solution && (
        <>
          <text className="card-name card-name-alternative" x={AREA_X - 22} y={24} fill={STRING_NUMBER_COLOR}>
            {solution.name}
          </text>
          <text className="card-hand card-family" x={layout.width - AREA_X + 22} y={27} textAnchor="end" fill={SECONDARY_COLOR}>
            {solution.family}
          </text>
        </>
      )}
      <g stroke={INK}>
        {layout.stringLines.map((line) => (
          <line className="card-string" key={line.y} x1={line.x1} x2={line.x2} y1={line.y} y2={line.y} strokeWidth={1.6} />
        ))}
        {layout.fretLines.map((x) => (
          <line className="card-fret" key={x} x1={x} x2={x} y1={AREA_Y} y2={AREA_Y + layout.areaHeight} strokeWidth={1.8} />
        ))}
      </g>
      {layout.nut && <rect className="card-nut" {...layout.nut} rx={2} fill={INK} />}
      {layout.stringNumbers.map((item) => (
        <text className="card-hand card-string-number" key={item.string} x={item.x} y={item.y} fill={STRING_NUMBER_COLOR}>
          {item.string}
        </text>
      ))}
      {layout.fretNumbers.map((item) => (
        <text className="card-hand card-fret-number" key={item.fret} x={item.x} y={item.y} fill={SECONDARY_COLOR}>
          {item.fret}
        </text>
      ))}
      {layout.dots.map((dot, i) => {
        if (!solution) {
          return (
            <circle
              key={`${dot.string}:${dot.fret}`}
              className="card-dot"
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill={NEUTRAL_COLORS.dotFill}
              stroke={NEUTRAL_COLORS.dotStroke}
              strokeWidth={1.4}
            />
          )
        }
        const degree = solution.notes[i]!.degree
        const tone = solution.targets.includes(degree) ? DEGREE_COLORS[degreeFunction(degree as Degree)] : null
        return (
          <g key={`${dot.string}:${dot.fret}`} className="scale-dot" data-degree={degree}>
            <circle
              className="card-dot"
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill={tone ? tone.fill : PASSING.fill}
              stroke={tone ? 'none' : PASSING.stroke}
              strokeWidth={tone ? 0 : 1.4}
            />
            <DegreeLabel degree={degree} cx={dot.cx} cy={dot.cy} color={tone ? tone.text : PASSING.text} />
          </g>
        )
      })}
    </svg>
  )
}
