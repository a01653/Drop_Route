import type { Catalog, DropFamily, SetDefinition, SetId } from '../data/types'

export type GameKind = 'recognition'
export type Difficulty = 'easy' | 'medium' | 'hard'

/** Elección del menú: qué se practica y con qué ayudas. */
export interface GameConfig {
  game: GameKind
  drop: DropFamily
  setId: SetId
  difficulty: Difficulty
}

export const DIFFICULTIES: readonly { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Medio' },
  { id: 'hard', label: 'Difícil' },
]

export const DROP_LABELS: Record<DropFamily, string> = { drop2: 'Drop 2', drop3: 'Drop 3', 'drop2+4': 'Drop 2+4' }

/** Familias Drop en el orden del catálogo. */
export function dropFamilies(catalog: Catalog): DropFamily[] {
  return [...new Set(catalog.sets.map((set) => set.drop))]
}

export function setsOfDrop(catalog: Catalog, drop: DropFamily): SetDefinition[] {
  return catalog.sets.filter((set) => set.drop === drop)
}

export function defaultConfig(catalog: Catalog): GameConfig {
  const first = catalog.sets[0]
  if (!first) throw new Error('El catálogo no tiene sets')
  return { game: 'recognition', drop: first.drop, setId: first.id, difficulty: 'easy' }
}

/**
 * Aplica un cambio del menú. Al cambiar de Drop se elige el primer set de esa familia, y un set que no
 * pertenece al Drop se descarta: la configuración nunca queda incoherente.
 */
export function updateConfig(
  catalog: Catalog,
  config: GameConfig,
  change: Partial<Pick<GameConfig, 'drop' | 'setId' | 'difficulty'>>,
): GameConfig {
  const drop = change.drop ?? config.drop
  const sets = setsOfDrop(catalog, drop)
  if (sets.length === 0) return config
  const wanted = change.setId ?? (change.drop && change.drop !== config.drop ? undefined : config.setId)
  const set = sets.find((item) => item.id === wanted) ?? sets[0]!
  return { ...config, drop, setId: set.id, difficulty: change.difficulty ?? config.difficulty }
}
