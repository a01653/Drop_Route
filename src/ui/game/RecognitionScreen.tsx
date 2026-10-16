import { Fragment, useId } from 'react'
import { catalog } from '../../data'
import type { Degree, Inversion, QualityKey } from '../../data'
import { DIFFICULTIES, DROP_LABELS, answerQualities, answerQualityLabel, isAnswerComplete, voicingOf } from '../../session'
import type { FieldResult, QuestionState, SessionAction, VerifiedState } from '../../session'
import { FretboardCard } from '../card/FretboardCard'
import { displayDegree, toPosition, toSolution } from '../card/model'
import { DegreeBoard } from './DegreeBoard'
import { useGameFocus } from './useGameFocus'

const INVERSIONS: Inversion[] = [0, 1, 2, 3]
const qualityName = (quality: QualityKey | null) => (quality ? answerQualityLabel(catalog, quality) : 'sin respuesta')
const inversionName = (inversion: Inversion | null) =>
  inversion === null ? 'sin respuesta' : (catalog.inversions[inversion] ?? 'sin respuesta')

interface RecognitionScreenProps {
  state: QuestionState | VerifiedState
  dispatch: (action: SessionAction) => void
  /** Semilla de la siguiente pregunta. La aplicación la saca del navegador. */
  newSeed: () => number
}

const degreeName = (degree: Degree | null) => (degree ? displayDegree(degree) : 'sin respuesta')

function fieldText(item: FieldResult): { name: string; given: string; expected: string } {
  if (item.field === 'quality') return { name: 'Acorde', given: qualityName(item.given), expected: qualityName(item.expected) }
  if (item.field === 'inversion') return { name: 'Inversión', given: inversionName(item.given), expected: inversionName(item.expected) }
  return {
    name: `Círculo ${item.slot + 1} (cuerda ${item.string}, traste ${item.fret})`,
    given: degreeName(item.given),
    expected: degreeName(item.expected),
  }
}

function headline(fields: FieldResult[]): string {
  const hits = fields.filter((item) => item.correct).length
  if (hits === fields.length) return 'Acierto completo'
  return hits > 0 ? 'Acierto parcial' : 'Incorrecto'
}

const PROMPTS = {
  easy: '¿Qué acorde es?',
  medium: '¿Qué acorde e inversión es?',
  hard: '¿Qué acorde, inversión y grados son?',
} as const

const HINTS = {
  easy: 'Elige un acorde para verificar.',
  medium: 'Elige acorde e inversión para verificar.',
  hard: 'Elige acorde e inversión y coloca los cuatro grados para verificar.',
} as const

/**
 * Pantalla de una pregunta de reconocimiento (R02 a R10). Antes de verificar la tarjeta es neutra y solo
 * recibe posiciones; al verificar muestra la solución con sus colores y la corrección campo por campo.
 */
export function RecognitionScreen({ state, dispatch, newSeed }: RecognitionScreenProps) {
  const { question, answer, config } = state
  const verified = state.phase === 'verificada'
  const result = verified ? state.result : null
  const voicing = voicingOf(catalog, question)
  const position = toPosition(voicing, catalog)
  const solution = verified ? toSolution(voicing, catalog) : null
  const set = catalog.sets.find((item) => item.id === question.setId)
  const complete = isAnswerComplete(question.difficulty, answer)
  const hintId = useId()
  const { questionHeading, resultHeading, resultPanel } = useGameFocus(question.number, verified)

  const qualityResult = result?.fields.find((item) => item.field === 'quality')
  const difficultyLabel = DIFFICULTIES.find((item) => item.id === config.difficulty)?.label ?? ''

  return (
    <main className="juego" data-phase={state.phase}>
      <header className="juego-cabecera">
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>
          Salir
        </button>
        <p>
          {DROP_LABELS[config.drop]} · set {set?.number} · {difficultyLabel}
        </p>
      </header>

      <h1 tabIndex={-1} ref={questionHeading}>
        Pregunta {question.number}
      </h1>

      <section className="juego-tarjeta" aria-label="Posición">
        {solution ? (
          <FretboardCard view="solution" position={position} solution={solution} />
        ) : question.difficulty === 'hard' && state.phase === 'pregunta' ? (
          <DegreeBoard
            position={position}
            slots={answer.degrees}
            held={state.held}
            onAction={(action) => dispatch({ type: 'degree', action })}
          />
        ) : (
          <FretboardCard view="neutral" position={position} />
        )}
        <p className="juego-pie">
          {solution
            ? `Solución: ${solution.name}, ${solution.inversionLabel} (bajo: ${displayDegree(solution.bass)}).`
            : `Cuerdas del set: ${set?.strings.join('-')}.`}
        </p>
      </section>

      <section className="juego-respuesta" aria-labelledby="respuesta-titulo">
        <h2 id="respuesta-titulo">{PROMPTS[question.difficulty]}</h2>

        {question.difficulty === 'easy' ? (
          <div className="opciones opciones-acorde" role="group" aria-labelledby="respuesta-titulo">
            {question.qualityOrder.map((quality) => {
              const chosen = answer.quality === quality
              // Tras verificar: el elegido en verde o rojo y, si falló, también el correcto en verde.
              const isExpected = verified && qualityResult?.expected === quality
              const mark = verified ? (chosen ? (qualityResult?.correct ? 'ok' : 'ko') : isExpected ? 'ok' : undefined) : undefined
              const note = !verified
                ? undefined
                : isExpected
                  ? chosen
                    ? 'Tu respuesta, correcta'
                    : 'Respuesta correcta'
                  : chosen
                    ? 'Tu respuesta, incorrecta'
                    : undefined
              const noteId = note ? `${hintId}-${quality}` : undefined
              return (
                <Fragment key={quality}>
                  <button
                    type="button"
                    className={mark}
                    aria-pressed={chosen}
                    aria-describedby={noteId}
                    disabled={verified}
                    onClick={() => dispatch({ type: 'choose', change: { quality } })}
                  >
                    {qualityName(quality)}
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
        ) : (
          <div className="desplegables">
            <label>
              <span>Acorde</span>
              <select
                value={answer.quality ?? ''}
                disabled={verified}
                onChange={(event) =>
                  dispatch({ type: 'choose', change: { quality: (event.target.value || null) as QualityKey | null } })
                }
              >
                <option value="">Elige el acorde</option>
                {answerQualities(catalog).map((quality) => (
                  <option key={quality} value={quality}>
                    {qualityName(quality)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Inversión</span>
              <select
                value={answer.inversion === null ? '' : String(answer.inversion)}
                disabled={verified}
                onChange={(event) =>
                  dispatch({
                    type: 'choose',
                    change: { inversion: event.target.value === '' ? null : (Number(event.target.value) as Inversion) },
                  })
                }
              >
                <option value="">Elige la inversión</option>
                {INVERSIONS.map((inversion) => (
                  <option key={inversion} value={inversion}>
                    {inversionName(inversion)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {!verified && (
          <>
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
                {HINTS[question.difficulty]}
              </p>
            )}
          </>
        )}
      </section>

      {result && (
        <section className="resultado" aria-labelledby="resultado-titulo" ref={resultPanel}>
          <h2 id="resultado-titulo" tabIndex={-1} ref={resultHeading}>
            {headline(result.fields)}
          </h2>
          {result.fields.length > 1 && (
            <p className="resumen">
              {result.fields.filter((item) => item.correct).length} de {result.fields.length} campos correctos.
            </p>
          )}
          <ul className="correccion">
            {result.fields.map((item) => {
              const text = fieldText(item)
              return (
                <li key={item.field === 'degree' ? `degree-${item.slot}` : item.field} className={item.correct ? 'ok' : 'ko'}>
                  <span className="marca" aria-hidden="true">
                    {item.correct ? '✓' : '✗'}
                  </span>
                  <span>
                    <strong>
                      {text.name}: {item.correct ? 'correcto' : 'incorrecto'}.
                    </strong>{' '}
                    Tu respuesta: {text.given}.{item.correct ? '' : ` Solución: ${text.expected}.`}
                  </span>
                </li>
              )
            })}
          </ul>
          <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'next', seed: newSeed() })}>
            Siguiente
          </button>
        </section>
      )}
    </main>
  )
}
