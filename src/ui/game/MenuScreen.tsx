import { catalog } from '../../data'
import { EMPTY_PROGRESS } from '../../progress'
import type { ProgressData } from '../../progress'
import { DIFFICULTIES, DROP_LABELS, GAMES, KEY_NAMES, ROUTE_MODES, ROUTE_STRETCHES, SCALES, dropFamilies, isScaleGame, setsOfDrop } from '../../session'
import type { Difficulty, MenuState, SessionAction } from '../../session'
import { OptionGroup } from './OptionGroup'
import { ProgressPanel } from './ProgressPanel'

const DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: 'Eliges el acorde entre cuatro botones.',
  medium: 'Eliges el acorde y la inversión con dos desplegables.',
  hard: 'Además colocas los grados sobre los cuatro círculos.',
}

const SCALE_DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: 'Eliges el patrón entre cinco botones.',
  medium: 'Eliges el patrón y marcas todas las tónicas.',
  hard: 'Eliges el patrón y marcas todas las tónicas, terceras, quintas y séptimas (sextas en la pentatónica mayor).',
}

const ORDER_HELP =
  'Ordenas los cinco patrones de grave a agudo en la tonalidad elegida. Las tarjetas no muestran los trastes.'

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

/**
 * Menú de arranque (R01): juego, Drop, set con sus cuerdas y dificultad o, en rutas, modo y tramo. Los juegos
 * de escalas piden escala y tonalidad en lugar de Drop y set.
 */
export function MenuScreen({ state, dispatch, newSeed, progress = EMPTY_PROGRESS }: MenuScreenProps) {
  const { config } = state
  const routes = config.game === 'routes'
  const scales = isScaleGame(config.game)
  const sets = setsOfDrop(catalog, config.drop, config.game)

  return (
    <main className="arranque menu" data-phase={state.phase}>
      <header>
        <h1>Drop Route</h1>
        <p className="lema">Estudia voicings de guitarra, rutas II-V-I y patrones de escala.</p>
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

        {scales ? (
          <>
            <OptionGroup
              legend="Escala"
              value={config.scaleId}
              onChange={(scaleId) => dispatch({ type: 'configure', change: { scaleId } })}
              options={SCALES.map(({ id, label }) => ({ id, label }))}
            />
            <section className="menu-tonalidad">
              <label>
                <span>Tonalidad</span>
                <select
                  value={String(config.scaleKey)}
                  onChange={(event) => {
                    const value = event.target.value
                    dispatch({ type: 'configure', change: { scaleKey: value === 'random' ? 'random' : Number(value) } })
                  }}
                >
                  {KEY_NAMES.map((name, pc) => (
                    <option key={pc} value={pc}>
                      {name}
                    </option>
                  ))}
                  <option value="random">Aleatoria (una en cada pregunta)</option>
                </select>
              </label>
            </section>
          </>
        ) : (
          <>
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
          </>
        )}

        {config.game === 'scale-order' ? (
          <p className="menu-ayuda">{ORDER_HELP}</p>
        ) : routes ? (
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
            <p className="menu-ayuda">{(scales ? SCALE_DIFFICULTY_HELP : DIFFICULTY_HELP)[config.difficulty]}</p>
          </>
        )}

        <button className="boton-principal" type="submit">
          Empezar
        </button>
        <a className="boton-secundario menu-estudio" href="#/study">
          Modo estudio
        </a>
        <a
          className="boton-secundario menu-estudio menu-manual"
          href={`${import.meta.env.BASE_URL}manual/Manual_Uso_Drop_Route.pdf`}
          target="_blank"
          rel="noopener"
          title="Abrir el manual de uso en otra pestaña"
        >
          Manual
        </a>
      </form>

      <ProgressPanel progress={progress} config={config} />
    </main>
  )
}
