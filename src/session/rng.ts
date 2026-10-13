// Azar reproducible. La sesión recibe la semilla desde fuera: en la aplicación sale del navegador y en
// los tests es fija, de modo que una pregunta se puede repetir exactamente.

export type Rng = () => number

/** mulberry32: generador de 32 bits, suficiente para barajar opciones y elegir preguntas. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates sobre una copia: no modifica la entrada. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('No hay elementos entre los que elegir')
  return items[Math.floor(rng() * items.length)]!
}
