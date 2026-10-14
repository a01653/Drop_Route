import { catalog } from '../../data'
import { bucketLabel, bucketsOfConfig, counterOf, formatCounter, summarize } from '../../progress'
import type { ProgressData } from '../../progress'
import type { GameConfig } from '../../session'

interface ProgressPanelProps {
  progress: ProgressData
  config: GameConfig
}

/**
 * Resumen compacto de lo guardado, con las cifras reales de los contadores: totales por juego, lo de la
 * configuración elegida y el detalle plegado. Sin puntos, clasificaciones ni rachas.
 */
export function ProgressPanel({ progress, config }: ProgressPanelProps) {
  const summary = summarize(progress, catalog)
  const chosen = bucketsOfConfig(config)

  return (
    <section className="estado progreso" aria-labelledby="progreso-titulo">
      <h2 id="progreso-titulo">Tu progreso</h2>
      {summary.total.attempts === 0 ? (
        <p>Todavía no has verificado ninguna pregunta. Cuando lo hagas, aquí verás tus intentos y aciertos.</p>
      ) : (
        <>
          <dl>
            <div>
              <dt>Reconocer voicings</dt>
              <dd>{formatCounter(summary.recognition)}</dd>
            </div>
            <div>
              <dt>Rutas II-V-I</dt>
              <dd>{formatCounter(summary.routes)}</dd>
            </div>
          </dl>
          <h3>Con lo que has elegido</h3>
          <ul className="progreso-lista">
            {chosen.map((bucket) => (
              <li key={bucketLabel(bucket, catalog)}>
                <span>{bucketLabel(bucket, catalog)}</span>
                <strong>{formatCounter(counterOf(progress, bucket))}</strong>
              </li>
            ))}
          </ul>
          <details>
            <summary>Ver todo el detalle</summary>
            <ul className="progreso-lista">
              {summary.lines.map((line) => (
                <li key={line.key}>
                  <span>{line.label}</span>
                  <strong>{formatCounter(line.counter)}</strong>
                </li>
              ))}
            </ul>
          </details>
          <p className="progreso-nota">
            Cada pregunta verificada cuenta un intento. Es un acierto solo si aciertas todo lo que pide el nivel o, en
            rutas, si eliges la candidata de nuestra ruta. Estos datos no salen de este dispositivo.
          </p>
        </>
      )}
    </section>
  )
}
