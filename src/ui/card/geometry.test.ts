import { describe, expect, it } from 'vitest'
import { catalog } from '../../data'
import type { QualityKey, SetId } from '../../data'
import {
  AREA_X,
  AREA_Y,
  CARD_HEIGHT,
  DOT_DIAMETER,
  FRET_WIDTH,
  MIN_COLUMNS,
  STRING_GAP,
  TEMPLATE_C6_GROUPS,
  groupWindow,
  layoutCard,
} from './geometry'
import { toPosition } from './model'
import { INK } from './palette'

const playable = catalog.voicings.filter((voicing) => voicing.quizEnabled)
const layoutOf = (voicing: (typeof playable)[number]) => {
  const position = toPosition(voicing, catalog)
  return { position, layout: layoutCard(position.notes, position.strings, position.window) }
}

describe('proporciones de la plantilla (docs/VISUAL.md)', () => {
  it('conserva traste 44, cuerdas cada 20, círculo de 18 y tinta #14183A', () => {
    expect(FRET_WIDTH).toBe(44)
    expect(STRING_GAP).toBe(20)
    expect(DOT_DIAMETER).toBe(18)
    expect(INK).toBe('#14183A')
  })

  it('dibuja seis cuerdas y cinco columnas de trastes en un lienzo de 264 por 166', () => {
    const { layout } = layoutOf(playable[0]!)
    expect(layout.stringLines).toHaveLength(6)
    expect(layout.fretLines).toHaveLength(MIN_COLUMNS + 1)
    expect(layout.width).toBe(264)
    expect(layout.height).toBe(CARD_HEIGHT)
    expect(layout.areaWidth).toBe(221)
    expect(layout.areaHeight).toBe(101)
  })
})

describe('las 112 formas evaluables', () => {
  it('son 112', () => expect(playable).toHaveLength(112))

  it('colocan cada círculo centrado entre dos trastes y sobre su cuerda', () => {
    for (const voicing of playable) {
      const { position, layout } = layoutOf(voicing)
      expect(layout.dots, voicing.id).toHaveLength(4)
      for (const dot of layout.dots) {
        const column = dot.fret - position.window.start
        const left = layout.fretLines[column]!
        const right = layout.fretLines[column + 1]!
        expect(dot.cx, `${voicing.id} traste ${dot.fret}`).toBeCloseTo((left + right) / 2, 9)
        expect(dot.cy, `${voicing.id} cuerda ${dot.string}`).toBe(layout.stringLines[dot.string - 1])
        expect(dot.r * 2).toBe(DOT_DIAMETER)
      }
    }
  })

  it('no recortan ningún círculo: caben dentro del mástil y del lienzo', () => {
    for (const voicing of playable) {
      const { layout } = layoutOf(voicing)
      const first = layout.fretLines[0]!
      const last = layout.fretLines[layout.fretLines.length - 1]!
      for (const dot of layout.dots) {
        expect(dot.cx - dot.r, voicing.id).toBeGreaterThanOrEqual(first)
        expect(dot.cx + dot.r, voicing.id).toBeLessThanOrEqual(last)
        expect(dot.cy - dot.r, voicing.id).toBeGreaterThanOrEqual(0)
        expect(dot.cy + dot.r, voicing.id).toBeLessThanOrEqual(layout.height)
      }
      expect(last + 11, voicing.id).toBeLessThanOrEqual(layout.width)
    }
  })

  it('no solapan círculos entre sí', () => {
    for (const voicing of playable) {
      const { layout } = layoutOf(voicing)
      for (const [i, a] of layout.dots.entries()) {
        for (const b of layout.dots.slice(i + 1)) {
          expect(Math.hypot(a.cx - b.cx, a.cy - b.cy), voicing.id).toBeGreaterThanOrEqual(DOT_DIAMETER)
        }
      }
    }
  })

  it('marcan con una equis exactamente las cuerdas que el set no toca', () => {
    for (const voicing of playable) {
      const { position, layout } = layoutOf(voicing)
      const expected = [1, 2, 3, 4, 5, 6].filter((string) => !position.strings.includes(string as 1))
      expect(layout.muteMarks.map((mark) => mark.string), voicing.id).toEqual(expected)
      expect(expected).toHaveLength(2)
      for (const mark of layout.muteMarks) {
        expect(mark.cx).toBe(AREA_X)
        expect(mark.cy).toBe(AREA_Y + (mark.string - 1) * STRING_GAP)
      }
    }
  })

  it('numeran los trastes desde el primero de la ventana y dibujan cejuelo solo si empieza en 1', () => {
    for (const voicing of playable) {
      const { position, layout } = layoutOf(voicing)
      expect(layout.fretNumbers.map((item) => item.fret), voicing.id).toEqual(
        Array.from({ length: position.window.count }, (_, i) => position.window.start + i),
      )
      expect(layout.nut !== null, voicing.id).toBe(position.window.start === 1)
    }
  })
})

describe('ventana de trastes', () => {
  const groups = new Map<string, typeof playable>()
  for (const voicing of playable) {
    const key = `${voicing.setId}/${voicing.inversion}`
    groups.set(key, [...(groups.get(key) ?? []), voicing])
  }

  it('hay 28 grupos de set e inversión, con cuatro calidades cada uno', () => {
    expect(groups.size).toBe(28)
    for (const members of groups.values()) {
      expect(members.map((item) => item.quality as QualityKey).sort()).toEqual(['7', 'maj7', 'm7', 'm7b5'].sort())
    }
  })

  it('comparte ventana entre las cuatro calidades y contiene todas sus notas', () => {
    for (const [key, members] of groups) {
      const windows = members.map((item) => toPosition(item, catalog).window)
      expect(new Set(windows.map((item) => `${item.start}/${item.count}`)).size, key).toBe(1)
      const { start, count } = windows[0]!
      for (const item of members) {
        for (const note of item.notes) {
          expect(note.fret, `${key} ${item.id}`).toBeGreaterThanOrEqual(start)
          expect(note.fret, `${key} ${item.id}`).toBeLessThanOrEqual(start + count - 1)
        }
      }
    }
  })

  it('basta con cinco columnas en todos los grupos, como la plantilla', () => {
    for (const [key, members] of groups) {
      const frets = members.flatMap((item) => item.notes.map((note) => note.fret))
      expect(Math.max(...frets) - Math.min(...frets) + 1, key).toBeLessThanOrEqual(MIN_COLUMNS)
      expect(groupWindow(catalog, members[0]!.setId as SetId, members[0]!.inversion).count, key).toBe(MIN_COLUMNS)
    }
  })

  it('Drop 2+4 set 1, 3.ª inversión, conserva la ventana de la plantilla desde el traste 12', () => {
    expect(groupWindow(catalog, 'D24S1', 3)).toEqual({ start: 12, count: 5 })
    const members = groups.get('D24S1/3')!
    expect(members).toHaveLength(4)
    for (const item of members) {
      const position = toPosition(item, catalog)
      expect(position.window, item.id).toEqual({ start: 12, count: 5 })
      const layout = layoutCard(position.notes, position.strings, position.window)
      expect(layout.fretNumbers.map((number) => number.fret), item.id).toEqual([12, 13, 14, 15, 16])
      expect(layout.nut, item.id).toBeNull()
      // Las notas no cambian y no se añade C6: cuatro círculos, ninguno en la columna del traste 12.
      expect(layout.dots, item.id).toHaveLength(4)
      expect(item.notes.map((note) => note.fret).sort(), item.id).not.toContain(12)
      expect(item.notes.some((note) => note.degree === ('6' as string)), item.id).toBe(false)
      expect(layout.dots.every((dot) => dot.cx > AREA_X + FRET_WIDTH), item.id).toBe(true)
    }
    expect(members.find((item) => item.quality === 'maj7')!.notes.map((note) => [note.string, note.fret])).toEqual([
      [5, 14],
      [4, 14],
      [2, 13],
      [1, 15],
    ])
  })

  it('la sexta de C6 solo adelanta la ventana de ese grupo y la posición física no cambia', () => {
    const moved: string[] = []
    for (const [key, members] of groups) {
      const lowest = Math.min(...members.flatMap((item) => item.notes.map((note) => note.fret)))
      const { start } = groupWindow(catalog, members[0]!.setId as SetId, members[0]!.inversion)
      if (start !== lowest) moved.push(`${key}: ${lowest} → ${start}`)
      expect(start, key).toBeLessThanOrEqual(lowest)
    }
    expect(moved).toEqual(['D24S1/3: 13 → 12'])
  })

  it('en los grupos con C6 la sexta cae en el mástil: el traste de la séptima menos dos', () => {
    for (const { setId, inversion } of TEMPLATE_C6_GROUPS) {
      const maj7 = groups.get(`${setId}/${inversion}`)!.find((item) => item.quality === 'maj7')!
      const seventh = maj7.notes.find((note) => note.degree === '7')!
      expect(seventh.fret - 2, `${setId}/${inversion}`).toBeGreaterThanOrEqual(1)
    }
    // Las nueve tarjetas Cmaj7 que la plantilla rotula "- C6" (e2e/reference.spec.ts las lee de su DOM).
    expect(TEMPLATE_C6_GROUPS.map(({ setId, inversion }) => `${setId}/${inversion}`)).toEqual([
      'D2S1/3',
      'D2S2/3',
      'D2S3/3',
      'D3S1/3',
      'D3S2/3',
      'D24S1/1',
      'D24S1/3',
      'D24S2/1',
      'D24S2/3',
    ])
  })

  it('se amplía en lugar de recortar si una forma se sale de la ventana', () => {
    const voicing = playable[0]!
    const wide = { start: Math.min(...voicing.notes.map((note) => note.fret)), count: 6 }
    const position = toPosition(voicing, catalog, wide)
    expect(layoutCard(position.notes, position.strings, wide).fretLines).toHaveLength(7)
    expect(() => layoutCard([{ string: 1, fret: 40 }], [1], { start: 3, count: 5 })).toThrow(/fuera de la ventana/)
  })
})

describe('oráculos tomados del DOM de la plantilla original', () => {
  // Para cada forma: ventana (primer traste, columnas) y, por círculo, [cuerda, x, y] relativos al
  // área del mástil, que en la plantilla son left + 9 y top + 9. Valores leídos del DOM renderizado.
  const oracle: { id: string; window: [number, number]; dots: [number, number, number][] }[] = [
    { id: 'd2s1-maj7-i0', window: [10, 5], dots: [[4, 22, 60], [3, 110, 40], [2, 110, 20], [1, 110, 0]] },
    { id: 'd2s1-maj7-i1', window: [1, 5], dots: [[4, 66, 60], [3, 154, 40], [2, 22, 20], [1, 110, 0]] },
    { id: 'd3s1-m7-i3', window: [11, 5], dots: [[5, 110, 80], [3, 66, 40], [2, 110, 20], [1, 22, 0]] },
  ]

  it('coincide con la posición dibujada por la plantilla', () => {
    for (const item of oracle) {
      const voicing = catalog.voicings.find((candidate) => candidate.id === item.id)!
      const { position, layout } = layoutOf(voicing)
      expect([position.window.start, position.window.count], item.id).toEqual(item.window)
      for (const [string, x, y] of item.dots) {
        const dot = layout.dots.find((candidate) => candidate.string === string)!
        expect(dot.cx - AREA_X, `${item.id} cuerda ${string}`).toBe(x)
        expect(dot.cy - AREA_Y, `${item.id} cuerda ${string}`).toBe(y)
      }
    }
  })
})
