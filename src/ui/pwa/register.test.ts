import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker, startPwa } from './register'
import { createUpdateController } from './update'

// Objetos con los eventos y el estado que usa el navegador: se prueba la lógica de registro y actualización, no un mock de ella.
class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing'
  posted: unknown[] = []
  postMessage(message: unknown) {
    this.posted.push(message)
  }
  become(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null
  installing: FakeWorker | null = null
  update = vi.fn(async () => undefined)
  /** Como el navegador: baja una versión, se instala y queda esperando si ya había otra controlando. */
  discover(worker: FakeWorker) {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
  }
  install(worker: FakeWorker) {
    this.installing = null
    this.waiting = worker
    worker.become('installed')
  }
}

class FakeContainer extends EventTarget {
  controller: object | null = null
  constructor(public registration: FakeRegistration | Error) {
    super()
  }
  register = vi.fn(async () => {
    if (this.registration instanceof Error) throw this.registration
    return this.registration
  })
}

function setup(options: { controller?: boolean; waiting?: boolean; fail?: Error } = {}) {
  const registration = new FakeRegistration()
  if (options.waiting) registration.waiting = new FakeWorker()
  const container = new FakeContainer(options.fail ?? registration)
  if (options.controller) container.controller = {}
  const announced: (() => void)[] = []
  const reload = vi.fn()
  const visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
  const run = () =>
    registerServiceWorker({
      scriptUrl: '/Drop_Route/sw.js',
      scope: '/Drop_Route/',
      container: container as unknown as ServiceWorkerContainer,
      announce: (apply) => announced.push(apply),
      reload,
      visibility: visibility as unknown as Document,
    })
  return { registration, container, announced, reload, visibility, run }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('registro del service worker', () => {
  it('registra el worker bajo la base y con ese ámbito', async () => {
    const { container, run, registration } = setup()
    expect(await run()).toBe(registration)
    expect(container.register).toHaveBeenCalledWith('/Drop_Route/sw.js', { scope: '/Drop_Route/' })
  })

  it('si el registro falla (sin conexión, navegador restringido) no lanza, no avisa y devuelve null', async () => {
    const { run, announced, reload } = setup({ fail: new TypeError('Failed to register') })
    await expect(run()).resolves.toBeNull()
    expect(announced).toEqual([])
    expect(reload).not.toHaveBeenCalled()
  })

  it('la primera instalación no es una actualización: sin worker previo no se avisa', async () => {
    const { registration, container, announced, run } = setup({ controller: false })
    await run()
    const worker = new FakeWorker()
    registration.discover(worker)
    registration.install(worker)
    expect(announced).toEqual([])
    // Y que el worker tome el control después (clients.claim) tampoco recarga la página.
    container.dispatchEvent(new Event('controllerchange'))
    expect(announced).toEqual([])
  })

  it('una versión que ya esperaba al abrir la página se anuncia', async () => {
    const { announced, run } = setup({ controller: true, waiting: true })
    await run()
    expect(announced).toHaveLength(1)
  })

  it('una versión que se descarga con la página abierta se anuncia al quedar instalada y esperando', async () => {
    const { registration, announced, run } = setup({ controller: true })
    await run()
    const worker = new FakeWorker()
    registration.discover(worker)
    expect(announced).toEqual([])
    worker.become('activating')
    expect(announced).toEqual([])
    registration.install(worker)
    expect(announced).toHaveLength(1)
  })

  it('no recarga nunca por su cuenta: ni al anunciar la versión ni si el control cambia sin que se pida actualizar', async () => {
    const { container, registration, announced, reload, run } = setup({ controller: true })
    await run()
    const worker = new FakeWorker()
    registration.discover(worker)
    registration.install(worker)
    expect(announced).toHaveLength(1)
    container.dispatchEvent(new Event('controllerchange'))
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
    expect(worker.posted).toEqual([])
  })

  it('al actualizar pide a la versión en espera que tome el control y recarga una sola vez, cuando lo toma', async () => {
    const { container, announced, reload, run, registration } = setup({ controller: true, waiting: true })
    await run()
    const apply = announced[0]!
    apply()
    expect(registration.waiting!.posted).toEqual([{ type: 'SKIP_WAITING' }])
    expect(reload).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('controllerchange'))
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('actualizar sin versión en espera no hace nada', async () => {
    const { container, announced, reload, run, registration } = setup({ controller: true, waiting: true })
    await run()
    const worker = registration.waiting!
    registration.waiting = null
    announced[0]!()
    expect(worker.posted).toEqual([])
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
  })

  it('al volver a primer plano comprueba si hay versión nueva, y un fallo de red no rompe nada', async () => {
    const { registration, visibility, run } = setup()
    await run()
    registration.update.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    visibility.visibilityState = 'hidden'
    visibility.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).not.toHaveBeenCalled()
    visibility.visibilityState = 'visible'
    visibility.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    visibility.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it('el controlador de la interfaz recibe el aviso y activa la versión anunciada', async () => {
    const { container, reload, registration } = setup({ controller: true })
    // Se conecta el registro real a un controlador real de la interfaz.
    const controller = createUpdateController()
    const registrationResult = await registerServiceWorker({
      scriptUrl: '/sw.js',
      scope: '/',
      container: container as unknown as ServiceWorkerContainer,
      announce: controller.announce,
      reload,
    })
    expect(registrationResult).toBe(registration)
    expect(controller.getSnapshot()).toBe(false)
    const worker = new FakeWorker()
    registration.discover(worker)
    registration.install(worker)
    expect(controller.getSnapshot()).toBe(true)
    controller.apply()
    expect(worker.posted).toEqual([{ type: 'SKIP_WAITING' }])
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

describe('arranque de la PWA', () => {
  const stubBrowser = (readyState: DocumentReadyState, container: FakeContainer) => {
    const loadListeners: (() => void)[] = []
    vi.stubGlobal('navigator', { serviceWorker: container })
    vi.stubGlobal('document', { readyState, visibilityState: 'visible', addEventListener: vi.fn() })
    vi.stubGlobal('window', {
      location: { reload: vi.fn() },
      addEventListener: (_type: string, listener: () => void) => loadListeners.push(listener),
    })
    return loadListeners
  }

  it('fuera de producción (desarrollo, tests) no registra nada', () => {
    const container = new FakeContainer(new FakeRegistration())
    stubBrowser('complete', container)
    vi.stubEnv('PROD', false)
    expect(startPwa()).toBeUndefined()
    expect(container.register).not.toHaveBeenCalled()
  })

  it('en producción sin soporte de service workers no hace nada', () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('navigator', {})
    expect(startPwa()).toBeUndefined()
  })

  it('en producción registra /sw.js con ámbito / (la base por defecto), de inmediato si la página ya cargó', async () => {
    vi.stubEnv('PROD', true)
    const container = new FakeContainer(new FakeRegistration())
    stubBrowser('complete', container)
    const controller = startPwa()
    expect(controller?.getSnapshot()).toBe(false)
    await vi.waitFor(() => expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' }))
  })

  it('si la página aún carga, espera a «load» para no competir con la primera carga', async () => {
    vi.stubEnv('PROD', true)
    const container = new FakeContainer(new FakeRegistration())
    const loadListeners = stubBrowser('loading', container)
    expect(startPwa()).toBeDefined()
    expect(container.register).not.toHaveBeenCalled()
    expect(loadListeners).toHaveLength(1)
    loadListeners[0]!()
    await vi.waitFor(() => expect(container.register).toHaveBeenCalledTimes(1))
  })
})
