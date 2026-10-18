import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../data'
import { defaultConfig } from '../session'
import { allBuckets, bucketKey, bucketLabel, bucketsOfConfig, counterOf, formatCounter, percentOf, summarize } from '.'

const PROGRESS = {
  'routes:D2S2:minor:v-i': { attempts: 2, correct: 2 },
  'recognition:D24S1:hard': { attempts: 4, correct: 1 },
  'routes:D2S2:minor:ii-v': { attempts: 5, correct: 3 },
  'recognition:D2S1:easy': { attempts: 10, correct: 7 },
  'recognition:D2S1:medium': { attempts: 0, correct: 0 },
}

describe('contadores posibles', () => {
  it('son reconocimiento por set y dificultad, y rutas por set con rutas, modo y tramo, sin repetirse', () => {
    const buckets = allBuckets(catalog, routesDocument)
    expect(buckets.filter((bucket) => bucket.game === 'recognition')).toHaveLength(catalog.sets.length * 3)
    expect(buckets.filter((bucket) => bucket.game === 'routes')).toHaveLength(2 * 2 * 2)
    expect(new Set(buckets.map(bucketKey)).size).toBe(buckets.length)
    expect(buckets[0]).toEqual({ game: 'recognition', setId: catalog.sets[0]!.id, difficulty: 'easy' })
  })

  it('la configuración del menú indica qué contadores muestra: uno, o dos en II → V → I', () => {
    const base = defaultConfig(catalog)
    expect(bucketsOfConfig(base).map(bucketKey)).toEqual(['recognition:D2S1:easy'])
    const routes = { ...base, game: 'routes' as const, routeMode: 'minor' as const }
    expect(bucketsOfConfig({ ...routes, stretch: 'ii-v' }).map(bucketKey)).toEqual(['routes:D2S1:minor:ii-v'])
    expect(bucketsOfConfig({ ...routes, stretch: 'v-i' }).map(bucketKey)).toEqual(['routes:D2S1:minor:v-i'])
    expect(bucketsOfConfig({ ...routes, stretch: 'both' }).map(bucketKey)).toEqual(['routes:D2S1:minor:ii-v', 'routes:D2S1:minor:v-i'])
  })

  it('un contador sin intentos vale cero', () => {
    expect(counterOf({}, { game: 'recognition', setId: 'D2S1', difficulty: 'easy' })).toEqual({ attempts: 0, correct: 0 })
  })
})

describe('resumen', () => {
  const summary = summarize(PROGRESS, catalog, routesDocument)

  it('suma por juego y en total con las cifras reales', () => {
    expect(summary.recognition).toEqual({ attempts: 14, correct: 8 })
    expect(summary.routes).toEqual({ attempts: 7, correct: 5 })
    expect(summary.total).toEqual({ attempts: 21, correct: 13 })
  })

  it('lista solo lo que tiene intentos, en el orden del menú, con su nombre', () => {
    expect(summary.lines.map((line) => [line.key, line.label])).toEqual([
      ['recognition:D2S1:easy', 'Drop 2 · set 1 · Fácil'],
      ['recognition:D24S1:hard', 'Drop 2+4 · set 1 · Difícil'],
      ['routes:D2S2:minor:ii-v', 'Drop 2 · set 2 · Menor · II → V'],
      ['routes:D2S2:minor:v-i', 'Drop 2 · set 2 · Menor · V → I'],
    ])
  })

  it('sin progreso no hay nada que listar', () => {
    expect(summarize({}, catalog, routesDocument)).toMatchObject({ total: { attempts: 0, correct: 0 }, lines: [] })
  })

  it('los nombres usan los del menú', () => {
    expect(bucketLabel({ game: 'routes', setId: 'D2S1', mode: 'major', leg: 'v-i' }, catalog)).toBe('Drop 2 · set 1 · Mayor · V → I')
  })
})

describe('porcentaje y texto', () => {
  it('se redondea al entero más cercano y sin intentos no hay porcentaje', () => {
    expect(percentOf({ attempts: 3, correct: 1 })).toBe(33)
    expect(percentOf({ attempts: 3, correct: 2 })).toBe(67)
    expect(percentOf({ attempts: 8, correct: 1 })).toBe(13)
    expect(percentOf({ attempts: 4, correct: 4 })).toBe(100)
    expect(percentOf({ attempts: 4, correct: 0 })).toBe(0)
    expect(percentOf({ attempts: 0, correct: 0 })).toBeNull()
  })

  it('se escribe como «aciertos de intentos (porcentaje)» o «Sin intentos»', () => {
    expect(formatCounter({ attempts: 10, correct: 7 })).toBe('7 de 10 (70 %)')
    expect(formatCounter({ attempts: 1, correct: 0 })).toBe('0 de 1 (0 %)')
    expect(formatCounter({ attempts: 0, correct: 0 })).toBe('Sin intentos')
  })
})
