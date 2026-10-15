import { useMemo, useState } from 'react'
import { catalog, routesDocument } from '../../data'
import type { ChordShape, DropFamily, Inversion, QualityKey, SetId } from '../../data'
import { DROP_LABELS } from '../../session'
import {
  TONALITIES,
  movementText,
  totalVoiceMovement,
  transposeRoute,
  transposeShapes,
  voiceMovement,
} from '../../study/transposition'
import { FretboardCard } from '../card/FretboardCard'
import { toPosition, toSolution } from '../card/model'
import { OptionGroup } from '../game/OptionGroup'
import './study.css'

const STUDY_KINDS = [
  { id: 'voicings', label: 'Voicings' },
  { id: 'routes', label: 'Rutas II-V-I' },
] as const

type StudyKind = (typeof STUDY_KINDS)[number]['id']

const QUALITY_OPTIONS: readonly QualityKey[] = ['maj7', '7', 'm7', 'm7b5']
const INVERSIONS: readonly Inversion[] = [0, 1, 2, 3]

const routeSets = catalog.sets.filter((set) => routesDocument.routes.some((route) => route.setId === set.id))
const firstSet = catalog.sets[0]!
const firstRouteSet = routeSets[0]!

const qualityLabel = (quality: QualityKey) => catalog.qualities[quality].name.replace(/^C/, '')
const inversionLabel = (inversion: Inversion) => catalog.inversions[inversion] ?? `Inversión ${inversion}`

function ShiftNote({ shift }: { shift: number }) {
  if (shift === 0) return <p className="study-note">Posición original en C.</p>
  const direction = shift > 0 ? 'arriba' : 'abajo'
  return (
    <p className="study-note">
      Forma desplazada {Math.abs(shift)} {Math.abs(shift) === 1 ? 'traste' : 'trastes'} hacia {direction}. Se conserva la
      misma disposición de voces.
    </p>
  )
}

function MovementPanel({ from, to, label }: { from: ChordShape; to: ChordShape; label: string }) {
  const voices = voiceMovement(from, to)
  return (
    <section className="study-movement" aria-label={`Movimiento ${label}`}>
      <h3>{label}</h3>
      <p className="study-note">Movimiento total: {totalVoiceMovement(from, to)} semitonos entre las cuatro voces.</p>
      <ul>
        {voices.map((voice) => (
          <li key={voice.string}>
            <strong>Cuerda {voice.string}</strong>: traste {voice.fromFret} → {voice.toFret} ({movementText(voice.delta)})
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StudyScreen() {
  const [kind, setKind] = useState<StudyKind>('voicings')
  const [tonicPc, setTonicPc] = useState(0)
  const [drop, setDrop] = useState<DropFamily>(firstSet.drop)
  const [setId, setSetId] = useState<SetId>(firstSet.id)
  const [quality, setQuality] = useState<QualityKey>('maj7')
  const [inversion, setInversion] = useState<Inversion>(0)
  const [routeSetId, setRouteSetId] = useState<SetId>(firstRouteSet.id)
  const [routeMode, setRouteMode] = useState<'major' | 'minor'>('major')
  const [routeIndex, setRouteIndex] = useState(0)
  const [showMovement, setShowMovement] = useState(true)

  const voicingSets = useMemo(() => catalog.sets.filter((set) => set.drop === drop), [drop])
  const voicing = useMemo(
    () => catalog.voicings.find((item) => item.quizEnabled && item.setId === setId && item.quality === quality && item.inversion === inversion),
    [setId, quality, inversion],
  )
  const transposedVoicing = useMemo(() => (voicing ? transposeShapes([voicing], tonicPc) : null), [voicing, tonicPc])

  const matchingRoutes = useMemo(
    () =>
      routesDocument.routes
        .filter((route) => route.setId === routeSetId && route.mode === routeMode)
        .sort((a, b) => (a.steps[0]?.inversion ?? 0) - (b.steps[0]?.inversion ?? 0)),
    [routeSetId, routeMode],
  )
  const route = matchingRoutes[Math.min(routeIndex, Math.max(0, matchingRoutes.length - 1))]
  const transposedRoute = useMemo(() => (route ? transposeRoute(route.steps, tonicPc) : null), [route, tonicPc])
  const selectedSet = catalog.sets.find((set) => set.id === setId)
  const selectedRouteSet = catalog.sets.find((set) => set.id === routeSetId)

  return (
    <main className="study">
      <header className="study-header">
        <div>
          <h1>Modo estudio</h1>
          <p className="lema">Consulta las formas, transpónlas y mira cómo se mueven las voces sin examen.</p>
        </div>
        <a className="boton-secundario study-back" href="#">
          Volver
        </a>
      </header>

      <OptionGroup
        legend="Estudiar"
        value={kind}
        onChange={setKind}
        options={STUDY_KINDS.map((item) => ({ id: item.id, label: item.label }))}
      />

      <section className="study-control">
        <label>
          <span>Tonalidad</span>
          <select value={tonicPc} onChange={(event) => setTonicPc(Number(event.target.value))}>
            {TONALITIES.map((tonality) => (
              <option key={tonality.pc} value={tonality.pc}>
                {tonality.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {kind === 'voicings' ? (
        <>
          <OptionGroup
            legend="Drop"
            value={drop}
            onChange={(nextDrop) => {
              setDrop(nextDrop)
              setSetId(catalog.sets.find((set) => set.drop === nextDrop)?.id ?? firstSet.id)
            }}
            options={[...new Set(catalog.sets.map((set) => set.drop))].map((item) => ({ id: item, label: DROP_LABELS[item] }))}
          />
          <OptionGroup
            legend="Set de cuerdas"
            value={setId}
            onChange={setSetId}
            options={voicingSets.map((set) => ({ id: set.id, label: `Set ${set.number}`, detail: `cuerdas ${set.strings.join('-')}` }))}
          />
          <OptionGroup
            legend="Calidad"
            value={quality}
            onChange={setQuality}
            options={QUALITY_OPTIONS.map((item) => ({ id: item, label: qualityLabel(item) }))}
          />
          <OptionGroup
            legend="Inversión"
            value={String(inversion)}
            onChange={(value) => setInversion(Number(value) as Inversion)}
            options={INVERSIONS.map((item) => ({ id: String(item), label: inversionLabel(item) }))}
          />

          <section className="study-card" aria-labelledby="study-voicing-title">
            <h2 id="study-voicing-title">Forma</h2>
            {transposedVoicing ? (
              <>
                <FretboardCard
                  view="solution"
                  position={toPosition(transposedVoicing.shapes[0]!, catalog)}
                  solution={toSolution(transposedVoicing.shapes[0]!, catalog)}
                />
                <p className="juego-pie">
                  {transposedVoicing.shapes[0]!.name} · {inversionLabel(inversion).toLowerCase()} · cuerdas {selectedSet?.strings.join('-')}
                </p>
                <ShiftNote shift={transposedVoicing.shift} />
              </>
            ) : (
              <p>No hay una forma disponible con esta combinación.</p>
            )}
          </section>
        </>
      ) : (
        <>
          <OptionGroup
            legend="Set de cuerdas"
            value={routeSetId}
            onChange={(value) => {
              setRouteSetId(value)
              setRouteIndex(0)
            }}
            options={routeSets.map((set) => ({ id: set.id, label: `Set ${set.number}`, detail: `cuerdas ${set.strings.join('-')}` }))}
          />
          <OptionGroup
            legend="Modo"
            value={routeMode}
            onChange={(value) => {
              setRouteMode(value)
              setRouteIndex(0)
            }}
            options={[
              { id: 'major', label: 'Mayor' },
              { id: 'minor', label: 'Menor' },
            ]}
          />
          <OptionGroup
            legend="Ruta"
            value={String(Math.min(routeIndex, Math.max(0, matchingRoutes.length - 1)))}
            onChange={(value) => setRouteIndex(Number(value))}
            options={matchingRoutes.map((item, index) => ({
              id: String(index),
              label: `Ruta ${index + 1}`,
              detail: `II ${inversionLabel(item.steps[0]!.inversion).toLowerCase()}`,
            }))}
          />

          {transposedRoute && route ? (
            <>
              <section className="study-route" aria-labelledby="study-route-title">
                <div className="study-route-heading">
                  <div>
                    <h2 id="study-route-title">Ruta completa</h2>
                    <p className="study-note">
                      {DROP_LABELS[selectedRouteSet?.drop ?? 'drop2']} · set {selectedRouteSet?.number} · {routeMode === 'major' ? 'mayor' : 'menor'}
                    </p>
                  </div>
                  <button className="boton-secundario" type="button" onClick={() => setShowMovement((value) => !value)}>
                    {showMovement ? 'Ocultar movimiento' : 'Ver movimiento'}
                  </button>
                </div>
                <div className="study-route-grid">
                  {transposedRoute.shapes.map((step, index) => (
                    <article key={step.function} className="study-route-step">
                      <h3>{step.function}</h3>
                      <FretboardCard view="solution" position={toPosition(step, catalog)} solution={toSolution(step, catalog)} />
                      <p className="juego-pie">
                        {step.name} · {inversionLabel(step.inversion).toLowerCase()}
                      </p>
                      {index < transposedRoute.shapes.length - 1 && <span className="study-arrow" aria-hidden="true">→</span>}
                    </article>
                  ))}
                </div>
                <ShiftNote shift={transposedRoute.shift} />
              </section>

              {showMovement && (
                <div className="study-movements">
                  <MovementPanel from={transposedRoute.shapes[0]!} to={transposedRoute.shapes[1]!} label="II → V" />
                  <MovementPanel from={transposedRoute.shapes[1]!} to={transposedRoute.shapes[2]!} label="V → I" />
                </div>
              )}
            </>
          ) : (
            <p>No hay rutas disponibles con esta combinación.</p>
          )}
        </>
      )}
    </main>
  )
}
