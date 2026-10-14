import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createAppStore } from './progress'
import { App } from './ui/App'
import { browserStorage } from './ui/browserStorage'
import { startPwa } from './ui/pwa/register'

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root en index.html')

// Un único almacén para toda la vida de la página: lee lo guardado una sola vez, también con StrictMode.
const store = createAppStore({ storage: browserStorage() })
const pwa = startPwa()

createRoot(container).render(
  <StrictMode>
    <App store={store} pwa={pwa} />
  </StrictMode>,
)
