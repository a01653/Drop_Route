import { useId } from 'react'
import { scalesDocument } from '../../data'
import { KEY_NAMES, evaluateOrder, expectedOrder, isOrderComplete, orderCardsOf, scaleOf } from '../../session'
import type { OrderAttempt, OrderQuestion, OrderQuestionState, OrderResult, OrderSummaryState, OrderVerifiedState, SessionAction } from '../../session'
import { SCALE_TARGET_DEGREES, neckOrder, patternsInKey } from '../../music/scalePatterns'
import { ScalePatternCard } from '../card/ScalePatternCard'
import { scaleColumns } from '../card/scaleLayout'
import { MINOR_SCALES, capital, patternName } from './scaleText'
import { useGameFocus } from './useGameFocus'

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const
const placeName = (place: number) => `${place}.º`

/** Las cinco formas en orden de grave a agudo, con trastes, grados y colores: la solución. */
function SolutionRow({ question }: { question: OrderQuestion }) {
  const scale = scaleOf(scalesDocument, question.scaleId)
  const ordered = neckOrder(patternsInKey(scale, question.tonicPc, scalesDocument.tonicPc))
  const layout = {
    columns: Math.max(...ordered.map((pattern) => scaleColumns(pattern.notes))),
    reserveOpen: ordered.some((pattern) => pattern.lowFret === 0),
  }
  return (
    <ol className="orden-solucion">
      {ordered.map((pattern, i) => (
        <li key={pattern.id}>
          <ScalePatternCard
            view="solution"
            notes={pattern.notes}
            name={`${placeName(i + 1)} · Patrón ${pattern.number}`}
            family={`FORMA ${pattern.caged}`}
            targets={SCALE_TARGET_DEGREES[question.scaleId]}
            minor={MINOR_SCALES.has(question.scaleId)}
            label={`${placeName(i + 1)}: ${scale.name} de ${KEY_NAMES[question.tonicPc]}, patrón ${pattern.number}, forma ${pattern.caged}`}
            layout={layout}
          />
          <p className="juego-pie">
            {capital(patternName(question.scaleId, pattern.number))} · trastes {pattern.lowFret}–{pattern.highFret}
          </p>
        </li>
      ))}
    </ol>
  )
}

function PlaceList({ question, result, sequence }: { question: OrderQuestion; result: OrderResult; sequence: readonly number[] }) {
  return (
    <ul className="correccion">
      {result.places.map((item) => {
        const card = sequence[item.place - 1]
        return (
          <li key={item.place} className={item.correct ? 'ok' : 'ko'}>
            <span className="marca" aria-hidden="true">{item.correct ? '✓' : '✗'}</span>
            <span>
              <strong>{placeName(item.place)}: {item.correct ? 'correcto' : 'incorrecto'}.</strong>{' '}
              {card === undefined
                ? 'Sin respuesta.'
                : `Pusiste la tarjeta ${LETTERS[card]} (${patternName(question.scaleId, item.given)}).`}
              {item.correct ? '' : ` Era el ${patternName(question.scaleId, item.expected)}.`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function headline(result: OrderResult): string {
  const hits = result.places.filter((item) => item.correct).length
  if (hits === result.places.length) return 'Orden correcto'
  return hits > 0 ? `${hits} de ${result.places.length} puestos correctos` : 'Orden incorrecto'
}

/** Revisión final de una sesión de ordenar, con el orden correcto de cada tonalidad. */
export function ScaleOrderSummaryScreen({ state, dispatch }: { state: OrderSummaryState; dispatch: (action: SessionAction) => void }) {
  const correct = state.attempts.filter((attempt) => attempt.result?.allCorrect).length
  return (
    <main className="juego resumen-reconocimiento">
      <header className="juego-cabecera">
        <p>Ordenar patrones · revisión del test</p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>Salir al menú</button>
      </header>
      <h1>Revisión del test</h1>
      <p className="resumen-ruta-total">{correct} de {state.attempts.length} órdenes correctos. Revisa tus errores pregunta por pregunta.</p>
      <ol className="lista-revision-ruta">
        {state.attempts.map((attempt) => <OrderAttemptReview key={attempt.question.number} attempt={attempt} />)}
      </ol>
    </main>
  )
}

function OrderAttemptReview({ attempt }: { attempt: OrderAttempt }) {
  const { question, answer } = attempt
  const result = attempt.result ?? evaluateOrder(question, answer)
  const answered = attempt.result !== null
  const scale = scaleOf(scalesDocument, question.scaleId)
  return (
    <li className={`revision-ruta-item ${answered ? (result.allCorrect ? 'ok' : 'ko') : 'pendiente'}`}>
      <h2>Pregunta {question.number} · {scale.name} de {KEY_NAMES[question.tonicPc]}</h2>
      <p className="revision-ruta-estado">{answered ? headline(result) : 'Sin verificar'}</p>
      <PlaceList question={question} result={result} sequence={answer.sequence} />
      <details className="revision-ruta-detalle">
        <summary>Ver el orden correcto</summary>
        <div className="revision-ruta-diagramas">
          <SolutionRow question={question} />
        </div>
      </details>
    </li>
  )
}

interface ScaleOrderScreenProps {
  state: OrderQuestionState | OrderVerifiedState
  dispatch: (action: SessionAction) => void
  newSeed: () => number
}

/**
 * Pregunta de «Ordenar patrones»: las cinco formas barajadas, neutras y sin trastes ni cejuelo, que hay que
 * tocar de la más grave a la más aguda. Al verificar se corrige puesto a puesto y se muestra el orden real.
 */
export function ScaleOrderScreen({ state, dispatch, newSeed }: ScaleOrderScreenProps) {
  const { question, answer } = state
  const verified = state.phase === 'orden-verificada'
  const result = verified ? state.result : null
  const scale = scaleOf(scalesDocument, question.scaleId)
  const cards = orderCardsOf(question)
  const layout = { showFrets: false, columns: Math.max(...cards.map((card) => scaleColumns(card.notes))) }
  const complete = isOrderComplete(answer)
  const hintId = useId()
  const { questionHeading, resultHeading, resultPanel } = useGameFocus(question.number, verified)
  const key = KEY_NAMES[question.tonicPc]
  const solution = verified ? expectedOrder(question) : null

  return (
    <main className="juego juego-orden" data-phase={state.phase}>
      <header className="juego-cabecera">
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>
          Salir
        </button>
        <button className="boton-secundario" type="button" disabled={state.position === 0} onClick={() => dispatch({ type: 'previous' })}>
          Anterior
        </button>
        <p>
          Ordenar · {scale.name}
          <span className="juego-tonica"><strong>Tónica: {key}</strong></span>
        </p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'finish-test' })}>
          Terminar y revisar
        </button>
      </header>

      <h1 tabIndex={-1} ref={questionHeading}>
        Pregunta {question.number}
      </h1>

      <section className="juego-respuesta" aria-labelledby="respuesta-titulo">
        <h2 id="respuesta-titulo">Ordena los patrones de grave a agudo</h2>
        <p className="juego-pista">
          {scale.name} de {key}. Toca las tarjetas empezando por la que queda más cerca del cejuelo. Vuelve a tocar una para
          quitarla del orden.
        </p>
        <div className="orden-tarjetas" role="group" aria-labelledby="respuesta-titulo">
          {cards.map((card, index) => {
            const place = answer.sequence.indexOf(index)
            const placeResult = verified && place >= 0 ? result?.places[place] : undefined
            const mark = placeResult ? (placeResult.correct ? 'ok' : 'ko') : undefined
            return (
              <button
                key={index}
                type="button"
                className={`orden-tarjeta${mark ? ` ${mark}` : ''}`}
                aria-pressed={place >= 0}
                aria-label={`Tarjeta ${LETTERS[index]}${place >= 0 ? `, puesto ${place + 1}` : ', sin colocar'}${mark ? (mark === 'ok' ? ', correcto' : ', incorrecto') : ''}`}
                disabled={verified}
                onClick={() => dispatch({ type: 'order-pick', card: index })}
              >
                <span className="orden-letra" aria-hidden="true">{LETTERS[index]}</span>
                <span className="orden-puesto" aria-hidden="true">
                  {place >= 0 ? placeName(place + 1) : ''}
                  {mark ? (mark === 'ok' ? ' ✓' : ' ✗') : ''}
                </span>
                <ScalePatternCard view="neutral" notes={card.notes} layout={layout} />
              </button>
            )
          })}
        </div>
        <p className="orden-actual" aria-live="polite">
          Tu orden: {LETTERS.map((_, i) => (answer.sequence[i] === undefined ? '—' : LETTERS[answer.sequence[i]!])).join(' · ')}
        </p>

        {!verified && (
          <>
            <button
              className="boton-secundario"
              type="button"
              disabled={answer.sequence.length === 0}
              onClick={() => dispatch({ type: 'order-reset' })}
            >
              Borrar orden
            </button>
            <button
              className="boton-principal"
              type="button"
              disabled={!complete}
              aria-describedby={complete ? undefined : hintId}
              onClick={() => dispatch({ type: 'verify' })}
            >
              Verificar
            </button>
            {!complete && (
              <p className="juego-pista" id={hintId}>
                Coloca las cinco tarjetas para verificar.
              </p>
            )}
          </>
        )}
      </section>

      {result && solution && (
        <section className="resultado" aria-labelledby="resultado-titulo" ref={resultPanel}>
          <h2 id="resultado-titulo" tabIndex={-1} ref={resultHeading}>
            {headline(result)}
          </h2>
          <p className="resumen">
            De grave a agudo en {key}: {solution.join(' – ')}.
          </p>
          <PlaceList question={question} result={result} sequence={answer.sequence} />
          <SolutionRow question={question} />
          <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'next', seed: newSeed() })}>
            Siguiente
          </button>
        </section>
      )}
    </main>
  )
}
