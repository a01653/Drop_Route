import { routesDocument } from '../data'
import type { Catalog, DropFamily, RoutesDocument, SetDefinition, SetId } from '../data/types'

export type GameKind = 'recognition' | 'routes'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type RouteMode = 'major' | 'minor'
/** Tramo que se practica: de II a V, de V a I, o ambos seguidos sobre la misma ruta. */
export type RouteStretch = 'ii-v' | 'v-i' | 'both'

/** Elección del menú: qué se practica y con qué ayudas. */
export interface GameConfig {
  game: GameKind
  drop: DropFamily
  setId: SetId
  /** Solo reconocimiento. */
  difficulty: Difficulty
  /** Solo rutas. */
  routeMode: RouteMode
  /** Solo rutas. */
  stretch: RouteStretch
}

export const DIFFICULTIES: readonly { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Medio' },
  { id: 'hard', label: 'Difícil' },
]

export const GAMES: readonly { id: GameKind; label: string }[] = [
  { id: 'recognition', label: 'Reconocer voicings' },
  { id: 'routes', label: 'Rutas II-V-I' },
]

export const ROUTE_MODES: readonly { id: RouteMode; label: string; detail: string }[] = [
  { id: 'major', label: 'Mayor', detail: 'Dm7 · G7 · Cmaj7' },
  { id: 'minor', label: 'Menor', detail: 'Dm7(♭5) · G7 · Cm7' },
]

export const ROUTE_STRETCHES: readonly { id: RouteStretch; label: string; detail: string }[] = [
  { id: 'ii-v', label: 'II → V', detail: 'del II al V' },
  { id: 'v-i', label: 'V → I', detail: 'del V al I' },
  { id: 'both', label: 'II → V → I', detail: 'los dos tramos seguidos' },
]

export const DROP_LABELS: Record<DropFamily, string> = { drop2: 'Drop 2', drop3: 'Drop 3', 'drop2+4': 'Drop 2+4' }

/** Sets con rutas normalizadas. Los demás no se ofrecen en rutas. */
export function routeSetIds(routes: RoutesDocument = routesDocument): SetId[] {
  return [...new Set(routes.routes.map((route) => route.setId))]
}

/** Sets que ofrece un juego: todos para reconocimiento, solo los que tienen rutas para rutas. */
export function setsForGame(catalog: Catalog, game: GameKind, routes: RoutesDocument = routesDocument): SetDefinition[] {
  if (game === 'recognition') return catalog.sets
  const withRoutes = routeSetIds(routes)
  return catalog.sets.filter((set) => withRoutes.includes(set.id))
}

/** Familias Drop que ofrece un juego, en el orden del catálogo. */
export function dropFamilies(catalog: Catalog, game: GameKind = 'recognition', routes: RoutesDocument = routesDocument): DropFamily[] {
  return [...new Set(setsForGame(catalog, game, routes).map((set) => set.drop))]
}

export function setsOfDrop(
  catalog: Catalog,
  drop: DropFamily,
  game: GameKind = 'recognition',
  routes: RoutesDocument = routesDocument,
): SetDefinition[] {
  return setsForGame(catalog, game, routes).filter((set) => set.drop === drop)
}

export function defaultConfig(catalog: Catalog): GameConfig {
  const first = catalog.sets[0]
  if (!first) throw new Error('El catálogo no tiene sets')
  return { game: 'recognition', drop: first.drop, setId: first.id, difficulty: 'easy', routeMode: 'major', stretch: 'ii-v' }
}

export type ConfigChange = Partial<Pick<GameConfig, 'game' | 'drop' | 'setId' | 'difficulty' | 'routeMode' | 'stretch'>>

/**
 * Aplica un cambio del menú. Al cambiar de Drop o de juego se elige un set válido, y un set que no pertenece
 * al Drop (o que no tiene rutas en el juego de rutas) se descarta: la configuración nunca queda incoherente.
 */
export function updateConfig(
  catalog: Catalog,
  config: GameConfig,
  change: ConfigChange,
  routes: RoutesDocument = routesDocument,
): GameConfig {
  const game = change.game ?? config.game
  const drops = dropFamilies(catalog, game, routes)
  if (drops.length === 0) return config
  const wantedDrop = change.drop ?? config.drop
  const drop = drops.includes(wantedDrop) ? wantedDrop : drops[0]!
  const sets = setsOfDrop(catalog, drop, game, routes)
  const keepSet = change.setId ?? (drop === config.drop ? config.setId : undefined)
  const set = sets.find((item) => item.id === keepSet) ?? sets[0]!
  return {
    game,
    drop,
    setId: set.id,
    difficulty: change.difficulty ?? config.difficulty,
    routeMode: change.routeMode ?? config.routeMode,
    stretch: change.stretch ?? config.stretch,
  }
}
