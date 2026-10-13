import { catalog, routesDocument, summarizeData } from '../../data'
import { DIFFICULTIES, DROP_LABELS, dropFamilies, setsOfDrop } from '../../session'
import type { Difficulty, MenuState, SessionAction } from '../../session'
import { OptionGroup } from './OptionGroup'

const summary = summarizeData(catalog, routesDocument)

const DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: 'Eliges el acorde entre cuatro botones.',
  medium: 'Eliges el acorde y la inversión con dos desplegables.',
  hard: 'Además colocas los grados sobre los cuatro círculos.',
}

interface MenuScreenProps {
  state: MenuState
  dispatch: (action: SessionAction) => void
  /** Semilla para la primera pregunta. La aplicación la saca del navegador. */
  newSeed: () => number
}

/** Menú de arranque (R01): juego, Drop, set con sus cuerdas y dificultad. */
export function MenuScreen({ state, dispatch, newSeed }: MenuScreenProps) {
  const { config } = state
  const sets = setsOfDrop(catalog, config.drop)

  return (
    <main className="arranque menu" data-phase={state.phase}>
      <header>
        <h1>Drop Route</h1>
        <p className="lema">Estudia voicings de guitarra y rutas II-V-I.</p>
      </header>

      <form
        className="menu-formulario"
        onSubmit={(event) => {
          event.preventDefault()
          dispatch({ type: 'start', seed: newSeed() })
        }}
      >
        <OptionGroup
          legend="Juego"
          value={config.game}
          onChange={() => undefined}
          options={[{ id: 'recognition', label: 'Reconocer voicings', detail: 'Tarjeta de un mástil corto' }]}
        />
        <p className="menu-pronto">Rutas II-V-I: próximamente.</p>

        <OptionGroup
          legend="Drop"
          value={config.drop}
          onChange={(drop) => dispatch({ type: 'configure', change: { drop } })}
          options={dropFamilies(catalog).map((drop) => ({ id: drop, label: DROP_LABELS[drop] }))}
        />

        <OptionGroup
          legend="Set de cuerdas"
          value={config.setId}
          onChange={(setId) => dispatch({ type: 'configure', change: { setId } })}
          options={sets.map((set) => ({
            id: set.id,
            label: `Set ${set.number}`,
            detail: `cuerdas ${set.strings.join('-')}`,
          }))}
        />

        <OptionGroup
          legend="Dificultad"
          value={config.difficulty}
          onChange={(difficulty) => dispatch({ type: 'configure', change: { difficulty } })}
          options={DIFFICULTIES.map(({ id, label }) => ({ id, label }))}
        />
        <p className="menu-ayuda">
          {DIFFICULTY_HELP[config.difficulty]}
        </p>

        <button className="boton-principal" type="submit">
          Empezar
        </button>
      </form>

      <section className="estado" aria-labelledby="estado-titulo">
        <h2 id="estado-titulo">Estado de desarrollo</h2>
        <p>
          <strong>En desarrollo.</strong> Ya puedes reconocer voicings en fácil, medio y difícil; las rutas
          II-V-I llegarán después.
        </p>
        <p>Datos cargados desde la plantilla original:</p>
        <dl>
          <div>
            <dt>Posiciones de juego</dt>
            <dd>{summary.playableVoicings}</dd>
          </div>
          <div>
            <dt>Posiciones de referencia</dt>
            <dd>{summary.referenceVoicings}</dd>
          </div>
          <div>
            <dt>Rutas II-V-I</dt>
            <dd>{summary.routes}</dd>
          </div>
        </dl>
        <p className="enlace-revision">
          <a href="#/revision">Revisar tarjetas e icono</a>
        </p>
      </section>
    </main>
  )
}
