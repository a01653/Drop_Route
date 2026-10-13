import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { Degree } from '../../data'
import { DEGREE_BANK, bankRemaining } from '../../session'
import type { DegreeAction, Held, Slots } from '../../session'
import { FretboardCard } from '../card/FretboardCard'
import { DOT_DIAMETER, FRET_WIDTH, STRING_GAP, layoutCard } from '../card/geometry'
import { displayDegree, spokenDegree } from '../card/model'
import type { CardPosition } from '../card/model'

/** Distancia en píxeles a partir de la cual un gesto deja de ser un toque y pasa a ser un arrastre. */
const DRAG_THRESHOLD = 6

interface DegreeBoardProps {
  position: CardPosition
  slots: Slots
  held: Held | null
  onAction: (action: DegreeAction) => void
}

interface Ghost {
  x: number
  y: number
  label: string
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`

function guidance(held: Held | null, slots: Slots): string {
  if (!held) return 'Arrastra un grado hasta un círculo, o toca el grado y luego el círculo. Toca un círculo ocupado para moverlo o devolverlo.'
  const degree = held.from === 'bank' ? held.degree : slots[held.slot]
  const name = degree ? spokenDegree(degree) : ''
  return held.from === 'bank'
    ? `Grado ${name} en la mano. Toca un círculo para colocarlo o pulsa Escape para cancelar.`
    : `Grado ${name} del círculo ${held.slot + 1} en la mano. Toca otro círculo para moverlo, devuélvelo al banco o pulsa Escape para cancelar.`
}

/**
 * Tarjeta neutra con cuatro destinos y banco fijo de grados (R05). Arrastre, dos toques y teclado envían las
 * mismas acciones a la sesión: coger, soltar, cancelar y quitar. Los destinos son botones colocados sobre los
 * círculos grises de la tarjeta; su área es la celda completa (traste por separación de cuerdas), mayor que el
 * círculo visible, sin solaparse con la de la cuerda contigua.
 */
export function DegreeBoard({ position, slots, held, onAction }: DegreeBoardProps) {
  const layout = layoutCard(position.notes, position.strings, position.window)
  const titleId = useId()
  const drag = useRef<{ source: Held; x: number; y: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [ghost, setGhost] = useState<Ghost | null>(null)

  /** Gestos de arrastre de una ficha, sea la del banco o la de un destino. */
  const dragging = (source: Held, label: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      suppressClick.current = false
      drag.current = { source, x: event.clientX, y: event.clientY, active: false }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current
      if (!current) return
      if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) > DRAG_THRESHOLD) {
        current.active = true
        onAction({ type: 'cancel' })
        onAction(source.from === 'bank' ? { type: 'pick-bank', degree: source.degree } : { type: 'pick-slot', slot: source.slot })
      }
      if (current.active) setGhost({ x: event.clientX, y: event.clientY, label })
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current
      drag.current = null
      if (!current?.active) return
      suppressClick.current = true
      setGhost(null)
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const slot = target?.closest<HTMLElement>('[data-destino]')
      if (slot) onAction({ type: 'drop-slot', slot: Number(slot.dataset.destino) })
      else if (target?.closest('[data-banco]')) onAction({ type: 'drop-bank' })
      else onAction({ type: 'cancel' })
    },
    onPointerCancel: () => {
      if (drag.current?.active) onAction({ type: 'cancel' })
      drag.current = null
      suppressClick.current = false
      setGhost(null)
    },
  })

  const swallowClick = () => {
    if (!suppressClick.current) return false
    suppressClick.current = false
    return true
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      onAction({ type: 'cancel' })
      return
    }
    const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-destino]')
    if (slot && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault()
      onAction({ type: 'clear-slot', slot: Number(slot.dataset.destino) })
    }
  }

  const remaining = bankRemaining(slots)
  const message = guidance(held, slots)

  return (
    <div className="tablero-grados" onKeyDown={onKeyDown}>
      <div className="tablero">
        <FretboardCard view="neutral" position={position} />
        {layout.dots.map((dot, index) => {
          const degree = slots[index] ?? null
          const isHeld = held?.from === 'slot' && held.slot === index
          return (
            <button
              key={dot.string}
              type="button"
              className={`destino${degree ? ' ocupado' : ''}${held ? ' objetivo' : ''}`}
              data-destino={index}
              aria-pressed={isHeld}
              aria-label={`Círculo ${index + 1}: cuerda ${dot.string}, traste ${dot.fret}, ${degree ? `grado ${spokenDegree(degree)}` : 'vacío'}`}
              style={{
                left: percent(dot.cx, layout.width),
                top: percent(dot.cy, layout.height),
                width: percent(FRET_WIDTH, layout.width),
                height: percent(STRING_GAP, layout.height),
              }}
              onClick={() => {
                if (swallowClick()) return
                onAction(held ? { type: 'drop-slot', slot: index } : { type: 'pick-slot', slot: index })
              }}
              {...(degree ? dragging({ from: 'slot', slot: index }, displayDegree(degree)) : {})}
            >
              <span
                className="destino-ficha"
                style={{ height: percent(DOT_DIAMETER, STRING_GAP) }}
                aria-hidden="true"
              >
                {degree ? displayDegree(degree) : ''}
              </span>
            </button>
          )
        })}
      </div>

      <section
        className="banco"
        data-banco
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget && held?.from === 'slot') onAction({ type: 'drop-bank' })
        }}
      >
        <h3 id={titleId}>Banco de grados</h3>
        <div className="fichas" role="group" aria-labelledby={titleId}>
          {DEGREE_BANK.map((degree: Degree) => {
            const placed = !remaining.includes(degree)
            const isHeld = held?.from === 'bank' && held.degree === degree
            return (
              <button
                key={degree}
                type="button"
                className={`ficha${placed ? ' colocada' : ''}`}
                aria-pressed={isHeld}
                aria-label={placed ? `Grado ${spokenDegree(degree)}, colocado` : `Grado ${spokenDegree(degree)}`}
                disabled={placed}
                onClick={() => {
                  if (swallowClick()) return
                  onAction({ type: 'pick-bank', degree })
                }}
                {...(placed ? {} : dragging({ from: 'bank', degree }, displayDegree(degree)))}
              >
                {displayDegree(degree)}
              </button>
            )
          })}
        </div>
        <button
          className="boton-secundario devolver"
          type="button"
          disabled={held?.from !== 'slot'}
          onClick={() => onAction({ type: 'drop-bank' })}
        >
          Devolver al banco
        </button>
      </section>

      <p className="tablero-estado" role="status" aria-live="polite">
        {message}
      </p>
      <p className="tablero-nota">Con teclado: Intro o Espacio coge y suelta; Escape cancela; Supr quita el grado de un círculo.</p>
      {ghost && (
        <span className="ficha-fantasma" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {ghost.label}
        </span>
      )}
    </div>
  )
}
