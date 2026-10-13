import { useState } from 'react'
import { catalog, routesDocument, summarizeData } from '../data'
import { createSession } from '../session'
import './app.css'

const summary = summarizeData(catalog, routesDocument)

export function App() {
  const [session] = useState(createSession)

  return (
    <main className="arranque" data-phase={session.phase}>
      <header>
        <h1>Drop Route</h1>
        <p className="lema">Estudia voicings de guitarra y rutas II-V-I.</p>
      </header>

      <section className="estado" aria-labelledby="estado-titulo">
        <h2 id="estado-titulo">Estado de desarrollo</h2>
        <p>
          <strong>En desarrollo.</strong> Todavía no hay juegos: pronto podrás reconocer voicings y
          continuar rutas II-V-I.
        </p>
        <p>Datos ya cargados desde la plantilla original:</p>
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
      </section>
    </main>
  )
}
