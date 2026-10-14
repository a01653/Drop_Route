import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { SERVICE_WORKER_TEMPLATE, cacheName, emitServiceWorker } from '../scripts/lib/pwa-build.mjs'

// Ayudas de pwa-update.spec.ts: dos builds reales de Vite fuera de dist/ y un servidor HTTP estático propio. Nada de
// aquí simula el navegador, el service worker, las cachés ni las respuestas: solo prepara qué contenido existe y quién
// lo sirve. El código de producción no se toca; la marca de cada build se escribe en su COPIA, y sw.js se vuelve a
// emitir con el generador real de scripts/lib/pwa-build.mjs para que la versión y la lista de recursos sean las suyas.

export type Label = 'A' | 'B'

export interface Build {
  label: Label
  dir: string
  base: string
  /** Versión que el generador real calculó para esta copia. */
  buildId: string
  /** Nombre de la caché que el service worker de esta copia abre. */
  cache: string
  /** Rutas del precaché relativas a la base: «./» es la raíz de la aplicación. */
  urls: string[]
  /** SHA-256 de los bytes de cada ruta del precaché, leídos del disco. */
  hashes: Record<string, string>
}

const run = promisify(execFile)
const sha256 = (bytes: Buffer | Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Build real de Vite con la base indicada, escrito en dir. Es el mismo vite.config.ts, solo cambia el destino. */
async function viteBuild(dir: string, base: string) {
  const vite = resolve('node_modules/vite/bin/vite.js')
  await run(process.execPath, [vite, 'build', '--outDir', dir, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: process.cwd(),
    env: { ...process.env, DROP_ROUTE_BASE: base },
    timeout: 240_000,
    maxBuffer: 32 * 1024 * 1024,
  })
}

/**
 * Marca exclusiva de test en la copia: una línea al final del script de entrada (qué JavaScript se ejecuta), una
 * etiqueta meta en el HTML (qué documento se cargó) y un recurso propio (qué caché contesta). No cambia el source.
 */
function mark(dir: string, base: string, label: Label) {
  const htmlPath = join(dir, 'index.html')
  const html = readFileSync(htmlPath, 'utf8')
  const entry = /<script\b[^>]*\bsrc="([^"]+\.js)"/.exec(html)?.[1]
  if (!entry?.startsWith(base)) throw new Error(`El script de entrada ${entry} no cuelga de la base ${base}`)
  if (!html.includes('</head>')) throw new Error('index.html del build no tiene </head>')
  appendFileSync(join(dir, entry.slice(base.length)), `\n;globalThis.__DROP_ROUTE_E2E_BUILD__=${JSON.stringify(label)};\n`)
  writeFileSync(htmlPath, html.replace('</head>', `<meta name="drop-route-e2e-build" content="${label}"></head>`))
  writeFileSync(join(dir, 'build-marker.json'), JSON.stringify({ build: label }))
}

async function makeBuild(label: Label, base: string, dir: string): Promise<Build> {
  await viteBuild(dir, base)
  mark(dir, base, label)
  const { buildId, urls } = emitServiceWorker({ dir, template: resolve(SERVICE_WORKER_TEMPLATE) })
  const hashes = Object.fromEntries(urls.map((path) => [path, sha256(readFileSync(join(dir, path === './' ? 'index.html' : path)))]))
  return { label, dir, base, buildId, cache: cacheName(base, buildId), urls, hashes }
}

/** Dos builds reales independientes (A y B) de la misma fuente para una base. Solo B y A difieren en sus marcas. */
export async function buildPair(base: string, parent: string): Promise<Record<Label, Build>> {
  const [A, B] = await Promise.all([makeBuild('A', base, join(parent, 'A')), makeBuild('B', base, join(parent, 'B'))])
  return { A, B }
}

/** URL absoluta de cada recurso del precaché de un build → su SHA-256: lo que su caché debe contener, byte a byte. */
export function expectedCache(build: Build, origin: string): Record<string, string> {
  return Object.fromEntries(build.urls.map((path) => [new URL(path, origin + build.base).href, build.hashes[path]!]))
}

// ---------------------------------------------------------------------------------------------------------------
// Servidor estático
// ---------------------------------------------------------------------------------------------------------------

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

export interface LogEntry {
  path: string
  status: number
}

export interface Site {
  origin: string
  base: string
  /** URL absoluta bajo la base de la aplicación. */
  url(path?: string): string
  /** Cambia qué build contesta a partir de ahora. Empieza sirviendo A. */
  serve(label: Label): void
  /** Todas las peticiones recibidas, en orden. */
  log: LogEntry[]
  close(): Promise<void>
}

/**
 * Servidor HTTP propio en un puerto que elige el sistema, solo en 127.0.0.1. Sirve el build activo bajo su base, con el
 * tipo MIME correcto y Cache-Control: no-store, y responde 404 fuera de la base. Cierra todas sus conexiones al parar.
 */
export async function startSite(base: string, builds: Record<Label, Build>): Promise<Site> {
  let current: Build = builds.A
  const log: LogEntry[] = []
  const server = createServer((request, response) => {
    void (async () => {
      let status = 404
      let body: Buffer | string = 'No encontrado'
      const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
      let pathname = request.url ?? '/'
      try {
        pathname = decodeURIComponent(new URL(pathname, 'http://127.0.0.1').pathname)
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          status = 405
        } else if (pathname.startsWith(base)) {
          const file = resolve(current.dir, pathname.slice(base.length) || 'index.html')
          if (file.startsWith(current.dir + sep) && (await stat(file)).isFile()) {
            body = await readFile(file)
            status = 200
            headers['Content-Type'] = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'
          }
        }
      } catch {
        status = 404
      }
      response.on('finish', () => log.push({ path: pathname, status }))
      response.writeHead(status, { ...headers, 'Content-Length': String(Buffer.byteLength(body)) })
      response.end(request.method === 'HEAD' ? undefined : body)
    })()
  })
  await new Promise<void>((done, fail) => {
    server.once('error', fail)
    server.listen(0, '127.0.0.1', done)
  })
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    origin,
    base,
    url: (path = '') => origin + base + path,
    serve: (label) => {
      current = builds[label]
    },
    log,
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>((done) => server.close(() => done()))
    },
  }
}
