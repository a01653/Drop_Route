import { createUpdateController } from './update'
import type { UpdateController } from './update'

export interface RegisterOptions {
  /** URL absoluta del service worker, bajo la base de la aplicación. */
  scriptUrl: string
  /** Ámbito: la base de la aplicación. El service worker no controla nada fuera de ella. */
  scope: string
  container: ServiceWorkerContainer
  /** Se llama con la función que activa la versión nueva cuando hay una esperando. */
  announce: (apply: () => void) => void
  reload: () => void
  /** Para comprobar actualizaciones cuando la aplicación vuelve a primer plano. */
  visibility?: Pick<Document, 'addEventListener' | 'visibilityState'>
}

/**
 * Registra el service worker. No activa nunca una versión nueva por su cuenta: la que se descarga espera, y la
 * página sigue con el código y la caché con los que arrancó hasta que la persona pide actualizar. Solo entonces se
 * le pide a la versión en espera que tome el control y, cuando lo hace, se recarga una vez. Así una pregunta abierta
 * no se pierde ni se mezclan los bundles de dos versiones. Si el registro falla (sin conexión en la primera visita,
 * navegador restringido) la aplicación sigue funcionando sin service worker.
 */
export async function registerServiceWorker(options: RegisterOptions): Promise<ServiceWorkerRegistration | null> {
  const { scriptUrl, scope, container, announce, reload, visibility } = options
  let registration: ServiceWorkerRegistration
  try {
    registration = await container.register(scriptUrl, { scope })
  } catch {
    return null
  }

  let applying = false
  let reloaded = false
  const apply = () => {
    const waiting = registration.waiting
    if (!waiting) return
    applying = true
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  container.addEventListener('controllerchange', () => {
    if (!applying || reloaded) return
    reloaded = true
    reload()
  })

  // Hay versión nueva si una espera y ya había otra controlando la página: la primera instalación no cuenta.
  const check = () => {
    if (registration.waiting && container.controller) announce(apply)
  }
  check()
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    if (!worker) return
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') check()
    })
  })
  visibility?.addEventListener('visibilitychange', () => {
    if (visibility.visibilityState === 'visible') registration.update().catch(() => undefined)
  })
  return registration
}

/**
 * Registro de producción. Solo en el build (no en npm run dev) y solo si el navegador lo admite. La base viene de
 * Vite: el service worker cuelga de ella y su ámbito es ella, de modo que /Drop_Route/ no toca el resto del origen.
 * vite preview sirve el build y por tanto registra el service worker: así se puede comprobar la PWA en local.
 */
export function startPwa(): UpdateController | undefined {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined
  const controller = createUpdateController()
  const base = import.meta.env.BASE_URL
  const run = () => {
    void registerServiceWorker({
      scriptUrl: `${base}sw.js`,
      scope: base,
      container: navigator.serviceWorker,
      announce: controller.announce,
      reload: () => window.location.reload(),
      visibility: document,
    })
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return controller
}
