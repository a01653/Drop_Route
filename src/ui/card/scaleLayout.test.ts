import { describe, expect, it } from 'vitest'
import { scalesDocument } from '../../data'
import { patternsInKey } from '../../music/scalePatterns'
import { AREA_X, CARD_HEIGHT, DOT_DIAMETER, MIN_COLUMNS } from './geometry'
import { OPEN_WIDTH, layoutScaleCard, scaleColumns } from './scaleLayout'

const major = scalesDocument.scales.find((item) => item.id === 'major')!
const inC = patternsInKey(major, 0)
const cShape = inC.find((pattern) => pattern.caged === 'C')!

describe('tarjeta de patrón de escala', () => {
  it('dibuja las cuerdas al aire a la izquierda del cejuelo', () => {
    const layout = layoutScaleCard(cShape.notes)
    expect(layout.window.start).toBe(1)
    expect(layout.nut).not.toBeNull()
    const open = layout.dots.filter((dot) => dot.fret === 0)
    expect(open.length).toBeGreaterThan(0)
    for (const dot of open) {
      expect(dot.cx + dot.r).toBeLessThan(layout.nut!.x)
      expect(dot.cx - dot.r).toBeGreaterThan(AREA_X)
    }
  })

  it('coloca cada nota en su columna y dentro de la tarjeta, sin solaparse', () => {
    for (const item of scalesDocument.scales) {
      for (const tonicPc of [0, 4, 7]) {
        for (const pattern of patternsInKey(item, tonicPc)) {
          const layout = layoutScaleCard(pattern.notes)
          const seen = new Set<string>()
          for (const dot of layout.dots) {
            expect(dot.cx - dot.r).toBeGreaterThan(0)
            expect(dot.cx + dot.r).toBeLessThan(layout.width)
            expect(dot.cy + dot.r).toBeLessThan(CARD_HEIGHT)
            const key = `${Math.round(dot.cx)}:${dot.cy}`
            expect(seen.has(key)).toBe(false)
            seen.add(key)
          }
          for (const a of layout.dots) {
            for (const b of layout.dots) {
              if (a !== b && a.cy === b.cy) expect(Math.abs(a.cx - b.cx)).toBeGreaterThanOrEqual(DOT_DIAMETER)
            }
          }
        }
      }
    }
  })

  it('con columnas comunes y hueco reservado, las cinco tarjetas miden lo mismo', () => {
    const options = { columns: Math.max(...inC.map((p) => scaleColumns(p.notes))), reserveOpen: true }
    const widths = new Set(inC.map((pattern) => layoutScaleCard(pattern.notes, options).width))
    expect(widths.size).toBe(1)
    expect(options.columns).toBeGreaterThanOrEqual(MIN_COLUMNS)
  })

  it('sin trastes no hay números, cejuelo ni hueco de cuerdas al aire', () => {
    const layout = layoutScaleCard(cShape.notes, { showFrets: false, reserveOpen: true })
    expect(layout.fretNumbers).toEqual([])
    expect(layout.nut).toBeNull()
    expect(layout.areaX).toBe(AREA_X)
    expect(OPEN_WIDTH).toBeGreaterThan(DOT_DIAMETER)
  })
})
