import { useState } from 'react'
import { catalog } from '../../data'
import type { DropFamily, QualityKey, SetId } from '../../data'
import { FretboardCard } from '../card/FretboardCard'
import { displayDegree, toPosition, toSolution } from '../card/model'
import { IconPreview } from './IconPreview'
import './review.css'

type View = 'neutral' | 'solution'

const QUALITY_ORDER: QualityKey[] = ['maj7', '7', 'm7', 'm7b5']
const DROP_NAMES: Record<DropFamily, string> = { drop2: 'Drop 2', drop3: 'Drop 3', 'drop2+4': 'Drop 2+4' }

/**
 * Pantalla de revisión de DR-002: no es un juego. Enseña las 16 formas de un set sobre sus tarjetas,
 * en vista neutra o de solución, y el icono. El orden (calidad por inversión) es el de la plantilla,
 * no el de una pregunta.
 */
export function ReviewScreen() {
  const [setId, setSetId] = useState<SetId>('D2S1')
  const [view, setView] = useState<View>('neutral')

  const cards = QUALITY_ORDER.flatMap((quality) =>
    catalog.voicings
      .filter((voicing) => voicing.quizEnabled && voicing.setId === setId && voicing.quality === quality)
      .sort((a, b) => a.inversion - b.inversion),
  )

  return (
    <main className="revision">
      <header>
        <p>
          <a href="#/">← Volver al inicio</a>
        </p>
        <h1>Revisión de tarjetas e icono</h1>
        <p className="revision-nota">
          Pantalla de revisión de DR-002, no un juego. Las 112 formas evaluables, por set. El orden de las
          tarjetas es el de la plantilla, no el de una pregunta.
        </p>
      </header>

      <section aria-labelledby="sets-titulo">
        <h2 id="sets-titulo">Set de cuerdas</h2>
        <div className="revision-opciones" role="group" aria-labelledby="sets-titulo">
          {catalog.sets.map((set) => (
            <button
              key={set.id}
              type="button"
              aria-pressed={set.id === setId}
              onClick={() => setSetId(set.id)}
            >
              <span>
                {DROP_NAMES[set.drop]} · set {set.number}
              </span>
              <small>cuerdas {set.strings.join('-')}</small>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="vista-titulo">
        <h2 id="vista-titulo">Vista</h2>
        <div className="revision-opciones revision-vistas" role="group" aria-labelledby="vista-titulo">
          <button type="button" aria-pressed={view === 'neutral'} onClick={() => setView('neutral')}>
            Neutra
          </button>
          <button type="button" aria-pressed={view === 'solution'} onClick={() => setView('solution')}>
            Solución
          </button>
        </div>
      </section>

      <section aria-labelledby="tarjetas-titulo">
        <h2 id="tarjetas-titulo">Tarjetas ({cards.length})</h2>
        <ol className="revision-rejilla">
          {cards.map((voicing, index) => {
            const position = toPosition(voicing, catalog)
            const solution = view === 'solution' ? toSolution(voicing, catalog) : null
            return (
              <li className="revision-tarjeta" key={voicing.id}>
                {solution ? (
                  <FretboardCard view="solution" position={position} solution={solution} />
                ) : (
                  <FretboardCard view="neutral" position={position} />
                )}
                <p>{solution ? `${solution.inversionLabel} · bajo: ${displayDegree(solution.bass)}` : `Tarjeta ${index + 1} de ${cards.length}`}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <IconPreview />
    </main>
  )
}
