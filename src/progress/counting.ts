import { catalog as defaultCatalog, routesDocument } from '../data'
import type { Catalog, RoutesDocument } from '../data/types'
import { reduceSession } from '../session'
import type { SessionAction, SessionState } from '../session'
import { bucketKey } from './buckets'
import type { Bucket, ProgressData } from './types'

export interface Attempt {
  readonly bucket: Bucket
  /** Acierto completo: todos los campos del nivel en reconocimiento, la candidata exacta en rutas. */
  readonly correct: boolean
}

/**
 * El intento que cuenta una transición de la sesión, o null si no cuenta ninguno. Solo cuenta el paso de una
 * pregunta abierta a verificada, que la sesión permite una única vez por pregunta: verificar de nuevo, cambiar
 * de vista, seleccionar, Siguiente y Salir no cambian de fase hacia «verificada» y por tanto no cuentan.
 */
export function attemptOf(before: SessionState, after: SessionState): Attempt | null {
  if (before.phase === 'pregunta' && after.phase === 'verificada') {
    return {
      bucket: { game: 'recognition', setId: after.question.setId, difficulty: after.question.difficulty },
      correct: after.result.allCorrect,
    }
  }
  if (before.phase === 'ruta' && after.phase === 'ruta-verificada') {
    return {
      bucket: {
        game: 'routes',
        setId: after.question.setId,
        mode: after.question.mode,
        leg: after.question.target === 'V' ? 'ii-v' : 'v-i',
      },
      correct: after.result.correct,
    }
  }
  return null
}

/** Suma un intento sin modificar el progreso recibido. */
export function addAttempt(progress: ProgressData, attempt: Attempt): ProgressData {
  const key = bucketKey(attempt.bucket)
  const current = progress[key] ?? { attempts: 0, correct: 0 }
  return {
    ...progress,
    [key]: { attempts: current.attempts + 1, correct: current.correct + (attempt.correct ? 1 : 0) },
  }
}

/** Sesión y contadores juntos: cada transición de la sesión decide, en el mismo paso puro, si cuenta un intento. */
export interface AppState {
  readonly session: SessionState
  readonly progress: ProgressData
}

/**
 * Reductor de la aplicación. Es puro: la misma entrada da siempre la misma salida, de modo que renderizar o
 * ejecutar el reductor dos veces no puede contar dos intentos. Si la sesión no cambia devuelve el mismo estado.
 */
export function reduceApp(
  state: AppState,
  action: SessionAction,
  catalog: Catalog = defaultCatalog,
  routes: RoutesDocument = routesDocument,
): AppState {
  const session = reduceSession(catalog, state.session, action, routes)
  if (session === state.session) return state
  const attempt = attemptOf(state.session, session)
  return { session, progress: attempt ? addAttempt(state.progress, attempt) : state.progress }
}
