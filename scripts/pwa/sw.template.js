// Service worker de Drop Route. Plantilla: al compilar, scripts/lib/pwa-build.mjs sustituye la versión y la lista
// de recursos y escribe el resultado como sw.js en la raíz del build.
//
// Reglas:
// - Precachea solo los recursos propios del build, en una caché con el ámbito y la versión del contenido (recursos
//   y este mismo worker). Nada más se guarda. No toca el almacenamiento del progreso: no depende de las cachés.
// - Una versión nueva se instala en su propia caché y ESPERA: la página abierta sigue con la suya hasta que la
//   persona pide actualizar (mensaje SKIP_WAITING). Así no se mezclan los bundles de dos versiones.
// - Al activarse borra solo las cachés propias de otras versiones EN SU ÁMBITO, nunca las de otras aplicaciones del
//   origen ni las de otra instalación de Drop Route en otra subruta.
// - Responde únicamente a GET del mismo origen dentro de su ámbito. Las navegaciones a la raíz de la aplicación
//   reciben el HTML precacheado; lo demás, su recurso precacheado o la red.
'use strict'

const BUILD_ID = /*__BUILD_ID__*/ 'dev'
const PRECACHE = /*__PRECACHE__*/ []
// «drop-route-precache:<ámbito>:<versión>». El ámbito (la ruta de la base, como /Drop_Route/) forma parte del nombre:
// dos instalaciones de la aplicación en el mismo origen no comparten ni se borran las cachés. La versión incluye el
// contenido de este mismo fichero, de modo que un worker nuevo siempre usa una caché nueva.
const SCOPE_PATH = new URL(self.registration.scope).pathname
const CACHE_SCOPE_PREFIX = 'drop-route-precache:' + SCOPE_PATH + ':'
const CACHE_NAME = CACHE_SCOPE_PREFIX + BUILD_ID

const absolute = (path) => new URL(path, self.registration.scope).href

async function precache() {
  const cache = await caches.open(CACHE_NAME)
  try {
    await Promise.all(
      PRECACHE.map(async (path) => {
        const url = absolute(path)
        // Se salta la caché HTTP para que la caché nueva contenga de verdad esta versión.
        const response = await fetch(new Request(url, { cache: 'reload' }))
        if (!response.ok) throw new Error('No se pudo precachear ' + url + ' (' + response.status + ')')
        await cache.put(url, response)
      }),
    )
  } catch (error) {
    // Una instalación a medias no deja una caché incompleta que parezca válida.
    await caches.delete(CACHE_NAME)
    throw error
  }
}

async function activate() {
  const names = await caches.keys()
  // Solo las cachés de esta aplicación en este ámbito y de otras versiones. Nunca las de otro ámbito ni otra app.
  await Promise.all(
    names.filter((name) => name.startsWith(CACHE_SCOPE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)),
  )
  await self.clients.claim()
}

function isShellNavigation(url) {
  const scope = new URL(self.registration.scope)
  return url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html'
}

async function respond(request, url) {
  // Se busca solo en la caché de esta versión: nunca en las de otras, para no mezclar recursos.
  const cache = await caches.open(CACHE_NAME)
  const key = request.mode === 'navigate' ? absolute('./') : url.origin + url.pathname
  const cached = await cache.match(key)
  return cached || fetch(request)
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(activate())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return
  if (request.mode === 'navigate' && !isShellNavigation(url)) return
  event.respondWith(respond(request, url))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
