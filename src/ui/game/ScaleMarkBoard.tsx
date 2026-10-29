import type { Degree, ScaleDegree } from '../../data'
import { ScalePatternCard } from '../card/ScalePatternCard'
import { DOT_DIAMETER, FRET_WIDTH, STRING_GAP } from '../card/geometry'
import type { PositionNote } from '../card/geometry'
import { displayDegree, spokenDegree } from '../card/model'
import { OPEN_WIDTH, layoutScaleCard } from '../card/scaleLayout'
import type { ScaleCardOptions } from '../card/scaleLayout'

/** Estado de una nota en la revisión: marca correcta, marca errónea o marca que faltaba. */
export type MarkStatus = 'ok' | 'ko' | 'falta' | null

interface ScaleMarkBoardProps {
  notes: PositionNote[]
  marks: readonly (ScaleDegree | null)[]
  layout?: ScaleCardOptions
  /** Toque sobre una nota. Sin él, el tablero es de solo lectura y muestra la revisión. */
  onTap?: (index: number) => void
  status?: readonly MarkStatus[]
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`
const STATUS_TEXT: Record<Exclude<MarkStatus, null>, string> = { ok: '✓', ko: '✗', falta: '!' }

/**
 * Tarjeta neutra del patrón con un botón sobre cada nota para marcar grados (Medio y Difícil). Cada botón
 * ocupa la celda de su nota, mayor que el círculo, y muestra solo lo que ha marcado quien juega. En la revisión
 * se dibuja de solo lectura con un aro verde, rojo o discontinuo, además del texto de la corrección.
 */
export function ScaleMarkBoard({ notes, marks, layout: options, onTap, status }: ScaleMarkBoardProps) {
  const layout = layoutScaleCard(notes, options)
  return (
    <div className="tablero tablero-escala">
      <ScalePatternCard view="neutral" notes={notes} layout={options} />
      {layout.dots.map((dot, index) => {
        const mark = marks[index] ?? null
        const state = status?.[index] ?? null
        const open = dot.cx < layout.areaX
        const style = {
          left: percent(dot.cx, layout.width),
          top: percent(dot.cy, layout.height),
          width: percent(open ? OPEN_WIDTH : FRET_WIDTH, layout.width),
          height: percent(STRING_GAP, layout.height),
        }
        const chip = (
          <span className="destino-ficha" style={{ height: percent(DOT_DIAMETER, STRING_GAP) }} aria-hidden="true">
            {mark ? displayDegree(mark) : state ? STATUS_TEXT[state] : ''}
          </span>
        )
        const classes = `destino${mark ? ' ocupado' : ''}${state ? ` revision-${state}` : ''}`
        return onTap ? (
          <button
            key={`${dot.string}:${dot.fret}`}
            type="button"
            className={classes}
            data-nota={index}
            aria-pressed={mark !== null}
            aria-label={`Cuerda ${dot.string}, traste ${dot.fret}: ${mark ? `marcada como ${spokenDegree(mark as Degree)}` : 'sin marcar'}`}
            style={style}
            onClick={() => onTap(index)}
          >
            {chip}
          </button>
        ) : (
          <span key={`${dot.string}:${dot.fret}`} className={classes} data-nota={index} style={style}>
            {chip}
          </span>
        )
      })}
    </div>
  )
}
