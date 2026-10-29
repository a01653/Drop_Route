import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../data'
import { createSession, expectedOrder, markedDegrees, placedPatternOf } from '../session'
import type { GameConfig, OrderQuestionState, ScaleQuestionState } from '../session'
import { allBuckets, bucketKey, bucketsOfConfig, reduceApp, summarize } from '.'
import type { AppState } from '.'

const menu = (change: Partial<GameConfig>): AppState => ({
  session: { phase: 'menu', config: { ...createSession(catalog).config, ...change } },
  progress: {},
})

describe('progreso de los juegos de escalas', () => {
  it('Reconocer patrones cuenta un intento por verificación, con acierto completo si todo es correcto', () => {
    let app = menu({ game: 'scale-patterns', scaleId: 'minor-pentatonic', difficulty: 'hard', scaleKey: 0 })
    app = reduceApp(app, { type: 'start', seed: 4 })
    const question = (app.session as ScaleQuestionState).question
    const wanted = markedDegrees(question.scaleId, question.difficulty)
    app = reduceApp(app, { type: 'scale-pattern', pattern: question.pattern })
    placedPatternOf(question).notes.forEach((note, index) => {
      if (wanted.includes(note.degree)) app = reduceApp(app, { type: 'scale-mark', index, degree: note.degree })
    })
    app = reduceApp(app, { type: 'verify' })
    app = reduceApp(app, { type: 'verify' })
    app = reduceApp(app, { type: 'previous' })
    expect(app.progress).toEqual({ 'scale-patterns:minor-pentatonic:hard': { attempts: 1, correct: 1 } })
  })

  it('Ordenar cuenta en su contador por escala; un orden con errores es un intento sin acierto', () => {
    let app = menu({ game: 'scale-order', scaleId: 'major', scaleKey: 'random' })
    app = reduceApp(app, { type: 'start', seed: 8 })
    const question = (app.session as OrderQuestionState).question
    const right = expectedOrder(question).map((number) => question.cards.indexOf(number))
    for (const card of [right[1]!, right[0]!, ...right.slice(2)]) app = reduceApp(app, { type: 'order-pick', card })
    app = reduceApp(app, { type: 'verify' })
    expect(app.progress).toEqual({ 'scale-order:major': { attempts: 1, correct: 0 } })
  })

  it('contadores posibles, configuración elegida y totales por juego', () => {
    const keys = allBuckets(catalog, routesDocument).map(bucketKey)
    expect(keys.filter((key) => key.startsWith('scale-patterns:'))).toHaveLength(12)
    expect(keys.filter((key) => key.startsWith('scale-order:'))).toEqual([
      'scale-order:major', 'scale-order:major-pentatonic', 'scale-order:minor-pentatonic', 'scale-order:natural-minor',
    ])
    const config = { ...createSession(catalog).config, game: 'scale-patterns' as const, scaleId: 'natural-minor' as const, difficulty: 'medium' as const }
    expect(bucketsOfConfig(config).map(bucketKey)).toEqual(['scale-patterns:natural-minor:medium'])
    const summary = summarize(
      {
        'scale-patterns:major:easy': { attempts: 4, correct: 3 },
        'scale-order:natural-minor': { attempts: 2, correct: 1 },
        'recognition:D2S1:easy': { attempts: 1, correct: 1 },
      },
      catalog,
    )
    expect(summary).toMatchObject({
      scalePatterns: { attempts: 4, correct: 3 },
      scaleOrder: { attempts: 2, correct: 1 },
      total: { attempts: 7, correct: 5 },
    })
    expect(summary.lines.map((line) => line.label)).toContain('Ordenar · Menor natural')
  })
})
