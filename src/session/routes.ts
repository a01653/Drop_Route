import { routesDocument } from '../data'
import type { Catalog, Inversion, Route, RouteStep, RoutesDocument, SetId } from '../data/types'
import { inversionFromBass } from '../music/pitch'
import type { GameConfig, RouteMode, RouteStretch } from './config'
import { pickOne, shuffle } from './rng'
import type { Rng } from './rng'

/** Paso que se pregunta: el V (desde el II) o el I (desde el V). */
export type RouteTarget = 'V' | 'I'

/** Los pasos de una ruta están en este orden: II, V, I. */
const STEP_INDEX: Record<'ii' | RouteTarget, number> = { ii: 0, V: 1, I: 2 }

/** Rutas de un set y modo. Son cuatro: una por inversión inicial. */
export function routeGroup(routes: RoutesDocument, setId: SetId, mode: RouteMode): Route[] {
  return routes.routes.filter((route) => route.setId === setId && route.mode === mode)
}

export function routeById(routes: RoutesDocument, id: string): Route {
  const route = routes.routes.find((item) => item.id === id)
  if (!route) throw new Error(`Ruta desconocida: ${id}`)
  return route
}

/** Paso de una ruta por su función. */
export function stepOf(route: Route, which: 'ii' | RouteTarget): RouteStep {
  const step = route.steps[STEP_INDEX[which]]
  if (!step) throw new Error(`La ruta ${route.id} no tiene el paso ${which}`)
  return step
}

/**
 * Una pregunta de ruta. La partida es el paso anterior de la ruta correcta (el II para llegar al V, el V para
 * llegar al I) y las candidatas son el mismo paso de las cuatro rutas del grupo, una por inversión. Solo una es
 * la de nuestra ruta; las otras son posiciones válidas de la misma calidad que el material no usa aquí.
 */
export interface RouteQuestion {
  /** Número de pregunta dentro de la sesión, desde 1. */
  number: number
  routeId: string
  setId: SetId
  mode: RouteMode
  /** Paso que se pregunta. */
  target: RouteTarget
  /** Rutas cuyo paso se ofrece, en el orden de los botones 1 a 4. */
  candidateRouteIds: string[]
}

/** Paso desde el que se parte: siempre el de la ruta correcta, también tras fallar el tramo anterior. */
export function startStep(routes: RoutesDocument, question: Pick<RouteQuestion, 'routeId' | 'target'>): RouteStep {
  return stepOf(routeById(routes, question.routeId), question.target === 'V' ? 'ii' : 'V')
}

export function answerStep(routes: RoutesDocument, question: Pick<RouteQuestion, 'routeId' | 'target'>): RouteStep {
  return stepOf(routeById(routes, question.routeId), question.target)
}

/** Las cuatro candidatas, en el orden de los botones. */
export function candidateSteps(routes: RoutesDocument, question: RouteQuestion): RouteStep[] {
  return question.candidateRouteIds.map((id) => stepOf(routeById(routes, id), question.target))
}

const targetFor = (stretch: RouteStretch): RouteTarget => (stretch === 'v-i' ? 'I' : 'V')

/**
 * Siguiente pregunta de ruta. En «II → V → I», tras el tramo II-V sigue el V-I de la misma ruta partiendo de su V
 * correcto; en los demás casos se elige otra ruta, distinta de la anterior mientras haya alternativas.
 */
export function createRouteQuestion(
  config: GameConfig,
  rng: Rng,
  routes: RoutesDocument = routesDocument,
  previous?: Pick<RouteQuestion, 'number' | 'routeId' | 'target'>,
): RouteQuestion {
  const group = routeGroup(routes, config.setId, config.routeMode)
  if (group.length === 0) throw new Error(`No hay rutas en ${config.setId} (${config.routeMode})`)
  const chaining = config.stretch === 'both' && previous?.target === 'V'
  const others = group.filter((item) => item.id !== previous?.routeId)
  const route = chaining ? routeById(routes, previous.routeId) : pickOne(others.length > 0 ? others : group, rng)
  return {
    number: (previous?.number ?? 0) + 1,
    routeId: route.id,
    setId: config.setId,
    mode: config.routeMode,
    target: chaining ? 'I' : targetFor(config.stretch),
    candidateRouteIds: shuffle(
      group.map((item) => item.id),
      rng,
    ),
  }
}

export interface RouteResult {
  /** La candidata elegida es la de nuestra ruta. */
  correct: boolean
  chosenRouteId: string
  expectedRouteId: string
  /** Inversiones sacadas del bajo físico de cada paso. */
  chosenInversion: Inversion | null
  expectedInversion: Inversion | null
}

/**
 * Compara con la ruta exacta del material. Que la candidata no coincida no la hace musicalmente incorrecta: es
 * otra posición válida de la misma calidad que esta ruta no usa.
 */
export function evaluateRoute(
  catalog: Catalog,
  routes: RoutesDocument,
  question: RouteQuestion,
  selected: number,
): RouteResult {
  const chosenRouteId = question.candidateRouteIds[selected]
  if (chosenRouteId === undefined) throw new Error(`Candidata fuera de rango: ${selected}`)
  const chosen = stepOf(routeById(routes, chosenRouteId), question.target)
  const expected = answerStep(routes, question)
  return {
    correct: chosenRouteId === question.routeId,
    chosenRouteId,
    expectedRouteId: question.routeId,
    chosenInversion: inversionFromBass(chosen, catalog),
    expectedInversion: inversionFromBass(expected, catalog),
  }
}
