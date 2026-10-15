import { catalog } from '../../data'
import { EMPTY_PROGRESS } from '../../progress'
import type { ProgressData } from '../../progress'
import { DIFFICULTIES, DROP_LABELS, GAMES, ROUTE_MODES, ROUTE_STRETCHES, dropFamilies, setsOfDrop } from '../../session'
import type { Difficulty, MenuState, SessionAction } from '../../session'
import { OptionGroup } from './OptionGroup'
import { ProgressPanel } from './ProgressPanel'

const DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: 'Eliges el acorde entre cuatro botones.',
  medium: 'Eliges el acorde y la inversión con dos desplegables.',
  hard: 'Además colocas los grados sobre los cuatro círculos.',
}

const ROUTES_HELP =
  'Partes de un acorde de nuestra ruta y eliges, entre cuatro candidatas, la posición que la continúa. Solo Drop 2, sets 1 y 2.'

interface MenuScreenProps {
  state: MenuState
  dispatch: (action: SessionAction) => void
  /** Semilla para la primera pregunta. La aplicación la saca del navegador. */
  newSeed: () => number
  /** Contadores guardados. Sin ellos se muestra el menú como la primera vez. */
  progress?: ProgressData
}

/** Menú de arranque (R01): juego, Drop, set con sus cuerdas y dificultad o, en rutas, modo y tramo. */
export function MenuScreen({ state, dispatch, newSeed, progress = EMPTY_PROGRESS }: MenuScreenProps) {
  const { config } = state
  const routes = config.game === 'routes'
  const sets = setsOfDrop(catalog, config.drop, config.game)

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
          onChange={(game) => dispatch({ type: 'configure', change: { game } })}
          options={GAMES.map(({ id, label }) => ({ id, label }))}
        />

        <OptionGroup
          legend="Drop"
          value={config.drop}
          onChange={(drop) => dispatch({ type: 'configure', change: { drop } })}
          options={dropFamilies(catalog, config.game).map((drop) => ({ id: drop, label: DROP_LABELS[drop] }))}
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

        {routes ? (
          <>
            <OptionGroup
              legend="Modo"
              value={config.routeMode}
              onChange={(routeMode) => dispatch({ type: 'configure', change: { routeMode } })}
              options={ROUTE_MODES.map(({ id, label, detail }) => ({ id, label, detail }))}
            />
            <OptionGroup
              legend="Tramo"
              value={config.stretch}
              onChange={(stretch) => dispatch({ type: 'configure', change: { stretch } })}
              options={ROUTE_STRETCHES.map(({ id, label, detail }) => ({ id, label, detail }))}
            />
            <p className="menu-ayuda">{ROUTES_HELP}</p>
          </>
        ) : (
          <>
            <OptionGroup
              legend="Dificultad"
              value={config.difficulty}
              onChange={(difficulty) => dispatch({ type: 'configure', change: { difficulty } })}
              options={DIFFICULTIES.map(({ id, label }) => ({ id, label }))}
            />
            <p className="menu-ayuda">{DIFFICULTY_HELP[config.difficulty]}</p>
          </>
        )}

        <button className="boton-principal" type="submit">
          Empezar
        </button>
        <a className="boton-secundario menu-estudio" href="#/study">
          Modo estudio
        </a>
        <p className="enlace-revision">
          <a href="#/revision">Revisar tarjetas e icono</a>
        </p>
      </form>

      <ProgressPanel progress={progress} config={config} />
    </main>
  )
}
