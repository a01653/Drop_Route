import { execFile, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

// El build y el servidor de las capturas del manual. Se construye la fuente actual en un directorio temporal (dist/ no
// se toca), se sirve con vite preview en un puerto libre que elige el sistema y se cierra siempre: close() mata el
// proceso, borra el directorio y es idempotente. Si el proceso de pruebas muere antes, el gancho de «exit» lo mata.

const run = promisify(execFile)
const vite = resolve('node_modules/vite/bin/vite.js')

export interface Preview {
  origin: string
  /** Directorio temporal con el build que sirve el preview. */
  dir: string
  close(): Promise<void>
}

/** Puerto libre en 127.0.0.1. vite preview se lanza con --strictPort: si alguien lo ocupa antes, falla en vez de moverse. */
async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((done, fail) => {
    server.once('error', fail)
    server.listen(0, '127.0.0.1', done)
  })
  const { port } = server.address() as AddressInfo
  await new Promise<void>((done) => server.close(() => done()))
  return port
}

const exited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null

async function stop(child: ChildProcess) {
  if (exited(child)) return
  const gone = new Promise<void>((done) => child.once('exit', () => done()))
  child.kill()
  const timer = setTimeout(() => child.kill('SIGKILL'), 5_000)
  await gone
  clearTimeout(timer)
}

/** Espera a que el preview sirva exactamente el index.html recién construido. Falla si el proceso muere antes. */
async function waitUntilServing(origin: string, child: ChildProcess, dir: string, output: () => string) {
  const wanted = readFileSync(join(dir, 'index.html'), 'utf8')
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (exited(child)) throw new Error(`vite preview terminó antes de servir (código ${child.exitCode}):\n${output()}`)
    try {
      const response = await fetch(`${origin}/`)
      if (response.ok && (await response.text()) === wanted) return
    } catch {
      // Todavía no escucha.
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error(`vite preview no sirvió el build en 60 s:\n${output()}`)
}

/** Construye la aplicación actual (misma configuración de Vite, base «/») y la sirve con vite preview. */
export async function startPreview(): Promise<Preview> {
  const parent = await mkdtemp(join(tmpdir(), 'drop-route-capturas-'))
  const dir = join(parent, 'dist')
  let child: ChildProcess | undefined
  let closed: Promise<void> | undefined
  const onExit = () => child?.kill()

  const close = () =>
    (closed ??= (async () => {
      process.off('exit', onExit)
      if (child) await stop(child)
      await rm(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    })())

  try {
    const env = { ...process.env }
    delete env.DROP_ROUTE_BASE
    await run(process.execPath, [vite, 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'warn'], {
      cwd: process.cwd(),
      env,
      timeout: 240_000,
      maxBuffer: 32 * 1024 * 1024,
    })

    const port = await freePort()
    const origin = `http://127.0.0.1:${port}`
    let log = ''
    child = spawn(process.execPath, [vite, 'preview', '--outDir', dir, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout?.on('data', (chunk: Buffer) => (log += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (log += chunk.toString()))
    process.once('exit', onExit)
    await waitUntilServing(origin, child, dir, () => log)
    return { origin, dir, close }
  } catch (error) {
    await close()
    throw error
  }
}
