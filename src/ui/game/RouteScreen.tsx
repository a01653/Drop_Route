import { Fragment, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { catalog, routesDocument } from '../../data'
import type { Inversion } from '../../data'
import { inversionFromBass } from '../../music/pitch'
import { DROP_LABELS, ROUTE_MODES, answerStep, candidateSteps, startStep } from '../../session'
import type { RouteQuestionState, RouteVerifiedState, SessionAction } from '../../session'
import { FretboardCard } from '../card/FretboardCard'
import { toPosition, toSolution } from '../card/model'
import { useGameFocus } from './useGameFocus'

const CANDIDATE_COUNT = 4
/** Desplazamiento horizontal mínimo, en píxeles, para que un gesto cuente como deslizamiento. */
const SWIPE_DISTANCE = 48

const inversionName = (inversion: Inversion | null) =>
  inversion === null ? 'sin determinar' : (catalog.inversions[inversion] ?? 'sin determinar')

interface RouteScreenProps {
  state: RouteQuestionState | RouteVerifiedState
  dispatch: (action: SessionAction) => void
  /** Semilla de la siguiente pregunta. La aplicación la saca del navegador. */
  newSeed: () => number
}

/** Tu respuesta o la solución, de una en una: nunca cuatro diagramas a la vez en móvil. */
function Comparison({ state }: { state: RouteVerifiedState }) {
  const [view, setView] = useState<'answer' | 'solution'>('solution')
  const candidates = candidateSteps(routesDocument, state.question)
  const chosen = candidates[state.selected]!
  const expected = answerStep(routesDocument, state.question)
  const shown = view === 'answer' ? chosen : expected
  return (
    <section className="comparacion" aria-labelledby="comparacion-titulo">
      <h2 id="comparacion-titulo">Compara</h2>
      <div className="opciones opciones-vista" role="group" aria-labelledby="comparacion-titulo">
        <button type="button" aria-pressed={view === 'answer'} onClick={() => setView('answer')}>
          Tu respuesta
        </button>
        <button type="button" aria-pressed={view === 'solution'} onClick={() => setView('solution')}>
          Solución
        </button>
      </div>
      <FretboardCard view="solution" position={toPosition(shown, catalog)} solution={toSolution(shown, catalog)} />
      <p className="juego-pie">
        {view === 'answer' ? `Tu respuesta: candidata ${state.selected + 1}, ` : 'Solución de nuestra ruta: '}
        {shown.name}, {inversionName(view === 'answer' ? state.result.chosenInversion : state.result.expectedInversion).toLowerCase()}.
      </p>
    </section>
  )
}

interface CandidateSelectorProps {
  selected: number
  /** Tras verificar: el selector sigue visible, bloqueado y con la corrección marcada. */
  result?: { expectedIndex: number }
  dispatchSelect: (index: number) => void
}

/**
 * Botones 1 a 4. Antes de verificar solo marcan la elegida (aria-pressed) y no dan pistas. Tras verificar quedan
 * bloqueados: la elegida va en rojo con ✗ si no es la de nuestra ruta (el rojo no dice que sea musicalmente inválida)
 * o en verde con ✓ si lo es, y la de nuestra ruta en verde con ✓. El nombre accesible no cambia: el estado va en la
 * descripción.
 */
function CandidateSelector({ selected, result, dispatchSelect }: CandidateSelectorProps) {
  const noteBase = useId()
  const onKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (result) return
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const index = Math.min(CANDIDATE_COUNT - 1, Math.max(0, selected + step))
    dispatchSelect(index)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus()
  }
  return (
    <div className="selector" role="group" aria-label="Candidata" onKeyDown={onKeys}>
      {Array.from({ length: CANDIDATE_COUNT }, (_, index) => {
        const chosen = index === selected
        const isExpected = result?.expectedIndex === index
        const mark = result ? (isExpected ? 'ok' : chosen ? 'ko' : undefined) : undefined
        const note = !result
          ? undefined
          : isExpected
            ? chosen
              ? 'Tu respuesta, la de nuestra ruta'
              : 'La de nuestra ruta'
            : chosen
              ? 'Tu respuesta, no es la de nuestra ruta'
              : undefined
        const noteId = note ? `${noteBase}-${index}` : undefined
        return (
          <Fragment key={index}>
            <button
              type="button"
              className={mark}
              aria-pressed={chosen}
              aria-label={`Candidata ${index + 1}`}
              aria-describedby={noteId}
              disabled={result !== undefined}
              onClick={() => dispatchSelect(index)}
            >
              {index + 1}
              {mark && <span aria-hidden="true"> {mark === 'ok' ? '✓' : '✗'}</span>}
            </button>
            {note && (
              <span className="solo-lectores" id={noteId}>
                {note}
              </span>
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

/**
 * Pantalla de una pregunta de ruta (R11 a R16): la partida siempre visible arriba, una sola candidata debajo, un
 * selector 1 a 4 (también por deslizamiento y teclado) y, tras verificar, Tu respuesta o Solución de una en una.
 */
export function RouteScreen({ state, dispatch, newSeed }: RouteScreenProps) {
  const { question, config } = state
  const verified = state.phase === 'ruta-verificada'
  const start = startStep(routesDocument, question)
  const target = answerStep(routesDocument, question)
  const candidates = candidateSteps(routesDocument, question)
  const candidate = candidates[state.selected]!
  const set = catalog.sets.find((item) => item.id === question.setId)
  const modeLabel = ROUTE_MODES.find((item) => item.id === config.routeMode)?.label ?? ''
  const stretchLabel = question.target === 'V' ? 'II → V' : 'V → I'
  const { questionHeading, resultHeading, resultPanel } = useGameFocus(question.number, verified)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const select = (index: number) => {
    if (index >= 0 && index < CANDIDATE_COUNT) dispatch({ type: 'candidate', index })
  }

  const onSwipeEnd = (event: PointerEvent<HTMLElement>) => {
    const origin = swipe.current
    swipe.current = null
    if (!origin) return
    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) select(state.selected + (dx < 0 ? 1 : -1))
  }

  return (
    <main className="juego ruta" data-phase={state.phase}>
      <header className="juego-cabecera">
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>
          Salir
        </button>
        <p>
          {DROP_LABELS[config.drop]} · set {set?.number} · {modeLabel} · {stretchLabel}
        </p>
      </header>

      <h1 tabIndex={-1} ref={questionHeading}>
        Pregunta {question.number}
      </h1>

      <section className="partida" aria-labelledby="partida-titulo">
        <h2 id="partida-titulo">Partida</h2>
        <FretboardCard view="solution" position={toPosition(start, catalog)} solution={toSolution(start, catalog)} />
        <p className="juego-pie">
          Partida: {start.name}, {inversionName(inversionFromBass(start, catalog)).toLowerCase()}.
        </p>
      </section>

      {!verified && (
        <section className="candidata" aria-labelledby="candidata-titulo">
          <h2 id="candidata-titulo">¿Qué {target.name} continúa la ruta?</h2>
          <div
            className="candidata-tarjeta"
            onPointerDown={(event) => {
              swipe.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={onSwipeEnd}
            onPointerCancel={() => {
              swipe.current = null
            }}
          >
            <FretboardCard view="neutral" position={toPosition(candidate, catalog)} />
          </div>
          <p className="juego-pie" aria-live="polite">
            Candidata {state.selected + 1} de {CANDIDATE_COUNT}. Desliza la tarjeta o usa los botones.
          </p>
          <CandidateSelector selected={state.selected} dispatchSelect={select} />
          <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'verify' })}>
            Verificar
          </button>
        </section>
      )}

      {verified && (
        <>
          <section className="resultado" aria-labelledby="resultado-titulo" ref={resultPanel}>
            <h2 id="resultado-titulo" tabIndex={-1} ref={resultHeading}>
              {state.result.correct ? 'Es la de nuestra ruta' : 'No es la de nuestra ruta'}
            </h2>
            <p className={`veredicto ${state.result.correct ? 'ok' : 'ko'}`}>
              <span className="marca" aria-hidden="true">
                {state.result.correct ? '✓' : '✗'}
              </span>{' '}
              {state.result.correct
                ? `La candidata ${state.selected + 1} coincide con la posición que usa el material para este paso.`
                : `Elegiste la candidata ${state.selected + 1}: ${candidate.name}, ${inversionName(state.result.chosenInversion).toLowerCase()}. Es otra posición válida de ${candidate.name}, pero esta ruta usa ${inversionName(state.result.expectedInversion).toLowerCase()}.`}
            </p>
            <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'next', seed: newSeed() })}>
              {config.stretch === 'both' && question.target === 'V' ? 'Siguiente: V → I' : 'Siguiente'}
            </button>
          </section>
          <section className="seleccion" aria-labelledby="seleccion-titulo">
            <h2 id="seleccion-titulo">Candidatas</h2>
            <CandidateSelector
              selected={state.selected}
              result={{ expectedIndex: question.candidateRouteIds.indexOf(question.routeId) }}
              dispatchSelect={select}
            />
          </section>
          <Comparison state={state} />
        </>
      )}
    </main>
  )
}
