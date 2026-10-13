import type { Degree } from '../../data'
import './card.css'
import { AREA_X, AREA_Y, layoutCard } from './geometry'
import type { DotGeometry } from './geometry'
import { positionLabel, solutionLabel } from './model'
import type { CardPosition, CardSolution } from './model'
import {
  DEGREE_COLORS,
  INK,
  NEUTRAL_COLORS,
  QUALITY_COLORS,
  SECONDARY_COLOR,
  STRING_NUMBER_COLOR,
  degreeFunction,
} from './palette'

export type FretboardCardProps =
  | { view: 'neutral'; position: CardPosition }
  | { view: 'solution'; position: CardPosition; solution: CardSolution }

const BORDER = 1.8
const FLAT_STEP = 6
const DIGIT_WIDTH = 6.5

/** Bemol dibujado como trazo: la fuente manuscrita no tiene ♭ y los símbolos del sistema varían. */
function Flat({ x, baseline, color }: { x: number; baseline: number; color: string }) {
  return (
    <path
      d="M0 -8 V3.4 M0 -1 C2.8 -2.6 5.4 -0.6 4.9 1.5 C4.5 2.8 2.2 3.4 0 3.4"
      transform={`translate(${x} ${baseline - 3.4})`}
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function DegreeLabel({ degree, cx, cy, color }: { degree: Degree; cx: number; cy: number; color: string }) {
  const flats = degree.startsWith('bb') ? 2 : degree.startsWith('b') ? 1 : 0
  const digit = degree.slice(flats)
  const baseline = cy + 4.5
  const total = flats * FLAT_STEP + DIGIT_WIDTH
  const left = cx - total / 2
  return (
    <>
      {Array.from({ length: flats }, (_, i) => (
        <Flat key={i} x={left + 1 + i * FLAT_STEP} baseline={baseline} color={color} />
      ))}
      <text className="card-hand card-dot-label" x={left + flats * FLAT_STEP + DIGIT_WIDTH / 2} y={baseline} fill={color}>
        {digit}
      </text>
    </>
  )
}

function NeutralDot({ dot }: { dot: DotGeometry }) {
  return (
    <circle
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

function SolutionDot({ dot, degree }: { dot: DotGeometry; degree: Degree }) {
  const colors = DEGREE_COLORS[degreeFunction(degree)]
  return (
    <g>
      <circle className="card-dot" cx={dot.cx} cy={dot.cy} r={dot.r} fill={colors.fill} />
      <DegreeLabel degree={degree} cx={dot.cx} cy={dot.cy} color={colors.text} />
    </g>
  )
}

/**
 * Tarjeta de una forma sobre un tramo corto del mástil. La vista neutra solo conoce las
 * posiciones: círculos grises iguales sobre un fondo común y sin ninguna etiqueta que dependa
 * de la respuesta. La vista de solución añade el nombre, los grados y los colores musicales.
 */
export function FretboardCard(props: FretboardCardProps) {
  const { position } = props
  const layout = layoutCard(position.notes, position.strings, position.window)
  const solution = props.view === 'solution' ? props.solution : null
  const colors = solution ? QUALITY_COLORS[solution.quality] : NEUTRAL_COLORS
  const background = solution ? QUALITY_COLORS[solution.quality].background : NEUTRAL_COLORS.background
  const label = solution ? solutionLabel(position, solution) : positionLabel(position)
  const family = solution ? QUALITY_COLORS[solution.quality].family : ''

  return (
    <svg
      className="fretboard-card"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <rect
        className="card-background"
        x={BORDER / 2}
        y={BORDER / 2}
        width={layout.width - BORDER}
        height={layout.height - BORDER}
        rx={14}
        fill={background}
        stroke={colors.border}
        strokeWidth={BORDER}
      />
      {solution && (
        <>
          <text className="card-name" x={AREA_X - 22} y={27} fill={STRING_NUMBER_COLOR}>
            {solution.name}
          </text>
          <text
            className="card-hand card-family"
            x={layout.width - AREA_X + 22}
            y={27}
            textAnchor="end"
            fill={SECONDARY_COLOR}
          >
            {family}
          </text>
        </>
      )}
      <g stroke={INK}>
        {layout.stringLines.map((y) => (
          <line className="card-string" key={y} x1={AREA_X} x2={AREA_X + layout.areaWidth} y1={y} y2={y} strokeWidth={1.6} />
        ))}
        {layout.fretLines.map((x) => (
          <line className="card-fret" key={x} x1={x} x2={x} y1={AREA_Y} y2={AREA_Y + layout.areaHeight} strokeWidth={1.8} />
        ))}
      </g>
      {layout.nut && (
        <rect className="card-nut" {...layout.nut} rx={2} fill={INK} />
      )}
      {layout.stringNumbers.map((item) => (
        <text className="card-hand card-string-number" key={item.string} x={item.x} y={item.y} fill={STRING_NUMBER_COLOR}>
          {item.string}
        </text>
      ))}
      {layout.muteMarks.map((mark) => (
        <path
          className="card-mute"
          key={mark.string}
          d={`M${mark.cx - 3.9} ${mark.cy - 3.9} L${mark.cx + 3.9} ${mark.cy + 3.9} M${mark.cx + 3.9} ${mark.cy - 3.9} L${mark.cx - 3.9} ${mark.cy + 3.9}`}
          fill="none"
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
      {layout.fretNumbers.map((item) => (
        <text className="card-hand card-fret-number" key={item.fret} x={item.x} y={item.y} fill={SECONDARY_COLOR}>
          {item.fret}
        </text>
      ))}
      {layout.dots.map((dot, i) =>
        solution ? (
          <SolutionDot key={dot.string} dot={dot} degree={solution.degrees[i] ?? '1'} />
        ) : (
          <NeutralDot key={dot.string} dot={dot} />
        ),
      )}
    </svg>
  )
}
