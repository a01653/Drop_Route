import { describe, expect, it } from 'vitest'
import { catalog, routesDocument, summarizeData } from '.'

describe('capa de datos', () => {
  it('expone el catálogo y las rutas de data/', () => {
    expect(catalog.voicings).toHaveLength(124)
    expect(routesDocument.routes).toHaveLength(16)
    expect(catalog.sets.map((set) => set.id)).toEqual([
      'D2S1',
      'D2S2',
      'D2S3',
      'D3S1',
      'D3S2',
      'D24S1',
      'D24S2',
    ])
  })

  it('resume 112 posiciones evaluables, 12 de referencia y 16 rutas', () => {
    expect(summarizeData(catalog, routesDocument)).toEqual({
      playableVoicings: 112,
      referenceVoicings: 12,
      routes: 16,
    })
  })

  it('mantiene Cdim7 fuera de las posiciones evaluables', () => {
    const dim7 = catalog.voicings.filter((voicing) => voicing.quality === 'dim7')
    expect(dim7).toHaveLength(12)
    expect(dim7.every((voicing) => !voicing.quizEnabled)).toBe(true)
  })
})
