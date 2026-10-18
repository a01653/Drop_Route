// Arnés para ejecutar el service worker generado, tal cual, en un contexto aislado de Node con una Cache API y una
// red simuladas. No se interpreta el código del worker: se dispara install, activate, fetch y message con eventos
// como los del navegador y se observa qué cachés quedan y qué responde.
import vm from 'node:vm';

export class FakeRequest {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method ?? input.method ?? 'GET';
    this.mode = init.mode ?? input.mode ?? 'cors';
    this.cache = init.cache ?? input.cache ?? 'default';
  }
}

const keyOf = request => (typeof request === 'string' ? request : request.url);

/** CacheStorage en memoria: nombres de caché -> URL -> respuesta. Se puede compartir entre varios workers. */
export function createCacheStorage() {
  const stores = new Map();
  const makeCache = () => {
    const entries = new Map();
    return {
      entries,
      async put(request, response) {
        entries.set(keyOf(request), { status: response.status, body: await response.clone().text() });
      },
      async match(request) {
        const hit = entries.get(keyOf(request));
        return hit ? new Response(hit.body, { status: hit.status }) : undefined;
      },
    };
  };
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, makeCache());
      return stores.get(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    names: () => [...stores.keys()],
  };
}

/** Red simulada: url -> cuerpo. Registra cada petición; sin conexión, fetch rechaza como el navegador. */
export function createNetwork(files = {}) {
  const network = {
    online: true,
    files: new Map(Object.entries(files)),
    requests: [],
    fetch: async input => {
      const request = typeof input === 'string' ? { url: input } : input;
      network.requests.push({ url: request.url, cache: request.cache, mode: request.mode });
      if (!network.online) throw new TypeError('Failed to fetch');
      const body = network.files.get(request.url);
      return body === undefined ? new Response('no encontrado', { status: 404 }) : new Response(body, { status: 200 });
    },
  };
  return network;
}

/** Carga el worker en un contexto propio. El ámbito decide el origen y el nombre de las cachés. */
export function loadServiceWorker(source, { scope, caches, network }) {
  const handlers = {};
  const calls = { skipWaiting: 0, claim: 0 };
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    addEventListener: (type, listener) => {
      handlers[type] = listener;
    },
    skipWaiting: () => {
      calls.skipWaiting += 1;
      return Promise.resolve();
    },
    clients: {
      claim: () => {
        calls.claim += 1;
        return Promise.resolve();
      },
    },
  };
  // Solo se le da lo que tiene un service worker: ni localStorage ni DOM. Si lo usara, fallaría.
  const context = vm.createContext({ self, caches, fetch: network.fetch, Request: FakeRequest, URL });
  new vm.Script(source, { filename: 'sw.js' }).runInContext(context);
  return { handlers, calls };
}

/** Dispara install o activate y espera lo que el worker pasó a waitUntil. */
export async function lifecycle(worker, type) {
  let pending = Promise.resolve();
  worker.handlers[type]({ waitUntil: promise => (pending = promise) });
  await pending;
}

/** Dispara fetch. intercepted indica si el worker llamó a respondWith; si no, el navegador usaría la red. */
export async function dispatchFetch(worker, { url, method = 'GET', mode = 'cors' }) {
  let response;
  let intercepted = false;
  worker.handlers.fetch({
    request: new FakeRequest(url, { method, mode }),
    respondWith: promise => {
      intercepted = true;
      response = promise;
    },
  });
  return intercepted ? { intercepted, response: await response } : { intercepted };
}

export const sendMessage = (worker, data) => worker.handlers.message({ data });
