import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../../data'
import type { Voicing } from '../../data'
import { transposeStudyVoicing, usesSourceSixth } from '../../study/transposition'
import { includeAnchorFret, layoutCard } from './geometry'
import { FretboardCard } from './FretboardCard'
import { positionLabel, spokenDegree, toPosition, toSolution } from './model'
import { DEGREE_COLORS, INK, NEUTRAL_COLORS, QUALITY_COLORS, SECONDARY_COLOR, STRING_NUMBER_COLOR, degreeFunction } from './palette'

const playable = catalog.voicings.filter((voicing) => voicing.quizEnabled)
const byId = (id: string): Voicing => {
  const voicing = catalog.voicings.find((item) => item.id === id)
  if (!voicing) throw new Error(`Falta ${id}`)
  return voicing
}

const neutral = (voicing: Voicing) => renderToStaticMarkup(<FretboardCard view="neutral" position={toPosition(voicing, catalog)} />)
const solution = (voicing: Voicing) =>
  renderToStaticMarkup(
    <FretboardCard view="solution" position={toPosition(voicing, catalog)} solution={toSolution(voicing, catalog)} />,
  )

const texts = (markup: string) => [...markup.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1]!)
const hexes = (markup: string) => [...new Set([...markup.matchAll(/#[0-9A-Fa-f]{6}/g)].map((match) => match[0].toUpperCase()))]
const dotFills = (markup: string) => [...markup.matchAll(/<circle class="card-dot"[^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map((match) => match[1]!)

describe('vista neutra', () => {
  const allowed = new Set(
    [NEUTRAL_COLORS.background, NEUTRAL_COLORS.border, NEUTRAL_COLORS.dotFill, NEUTRAL_COLORS.dotStroke, INK, STRING_NUMBER_COLOR, SECONDARY_COLOR].map(
      (color) => color.toUpperCase(),
    ),
  )
  const musical = new Set(
    [
      ...Object.values(DEGREE_COLORS).flatMap((item) => [item.fill, item.text]),
      ...Object.values(QUALITY_COLORS).flatMap((item) => [item.background, item.border]),
    ].map((color) => color.toUpperCase()),
  )

  it('no usa ningún color musical ni de calidad en las 112 formas', () => {
    for (const voicing of playable) {
      const used = hexes(neutral(voicing))
      expect(used.filter((color) => !allowed.has(color)), voicing.id).toEqual([])
      expect(used.filter((color) => musical.has(color) && !allowed.has(color)), voicing.id).toEqual([])
    }
  })

  it('solo contiene números como texto: cuerdas y trastes', () => {
    for (const voicing of playable) {
      for (const text of texts(neutral(voicing))) expect(text, voicing.id).toMatch(/^\d+$/)
    }
  })

  it('no lleva identificadores, atributos de datos, títulos ni nombres de acorde', () => {
    const words = /maj7|m7b5|dim|inversi|fundamental|mayor|dominante|menor|semidisminuido|bemol|Cm?7|grado|raíz|tercera|quinta|séptima/i
    for (const voicing of playable) {
      const markup = neutral(voicing)
      expect(markup, voicing.id).not.toMatch(/\bid=|data-|<title|<desc/)
      expect(markup, voicing.id).not.toContain(voicing.id)
      expect(markup, voicing.id).not.toMatch(words)
    }
  })

  it('dibuja cuatro círculos grises idénticos y un fondo común en las 112 formas', () => {
    const backgrounds = new Set<string>()
    for (const voicing of playable) {
      const markup = neutral(voicing)
      const dots = [...markup.matchAll(/<circle class="card-dot"[^>]*>/g)].map((match) => match[0].replace(/ c[xy]="[^"]*"/g, ''))
      expect(dots, voicing.id).toHaveLength(4)
      expect(new Set(dots).size, voicing.id).toBe(1)
      backgrounds.add(/<rect class="card-background"[^>]*>/.exec(markup)![0])
    }
    expect(backgrounds.size).toBe(1)
  })

  it('su nombre accesible lista solo las posiciones, que son la pregunta', () => {
    for (const voicing of playable) {
      const label = /aria-label="([^"]*)"/.exec(neutral(voicing))![1]!
      expect(label, voicing.id).toMatch(/^Posición de 4 notas: cuerda \d, traste \d+(; cuerda \d, traste \d+){3}\.$/)
      expect(label).toBe(positionLabel(toPosition(voicing, catalog)))
    }
  })

  it('no depende de nada que no sean las posiciones', () => {
    const original = byId('d2s1-m7-i2')
    const disguised: Voicing = {
      ...original,
      id: 'otra-forma',
      name: 'Cmaj7',
      quality: 'maj7',
      inversion: 0,
      quizEnabled: false,
      notes: original.notes.map((note) => ({ ...note, degree: '1' })),
    }
    expect(toPosition(disguised, catalog)).toEqual(toPosition(original, catalog))
    expect(neutral(disguised)).toBe(neutral(original))
  })

  it('distingue dos formas solo por la posición de sus notas', () => {
    expect(neutral(byId('d2s1-maj7-i0'))).not.toBe(neutral(byId('d2s1-maj7-i1')))
  })
})

describe('vista de solución', () => {
  it('encuadra la sexta y su séptima de referencia en los nueve casos de la fuente y las doce tonalidades', () => {
    const variants = playable.filter(usesSourceSixth)
    expect(variants).toHaveLength(9)
    for (const source of variants) {
      const seventh = source.notes.find((note) => note.degree === '7')!
      for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
        const { shape, shift } = transposeStudyVoicing(source, tonicPc)
        const reference = shape.referenceNotes!
        expect(reference).toEqual([{ ...seventh, fret: seventh.fret + shift }])
        const sixth = shape.notes.find((note) => note.degree === '6')!
        expect(sixth.string).toBe(seventh.string)
        expect(sixth.fret).toBe(reference[0]!.fret - 2)
        const position = toPosition(shape, catalog)
        const dots = layoutCard([...position.notes, ...reference], position.strings, position.window).dots
        expect(dots).toHaveLength(5)
        expect(dots.every((dot) => dot.cx - dot.r > 32 && dot.cy - dot.r >= 0)).toBe(true)
      }
    }
  })

  it('conserva la séptima gris como referencia de C6 sin añadir una quinta voz ni mostrar pistas en neutra', () => {
    const source = byId('d2s1-maj7-i3')
    const shape = transposeStudyVoicing(source, 0).shape
    const position = toPosition(shape, catalog)
    const markup = renderToStaticMarkup(<FretboardCard view="solution" position={position} solution={toSolution(shape, catalog)} />)
    expect(position.notes).toHaveLength(4)
    expect(markup).toContain('Cmaj7 – C6')
    expect(markup).toContain('Referencia en gris: cuerda 4, traste 9, grado 7.')
    expect(markup).toMatch(/<circle class="card-dot card-reference-dot"[^>]*fill="#DFE1EA"/)
    expect(markup).toContain('fill="#9AA3C9"')
    expect(texts(markup).filter((text) => text === '6')).toHaveLength(2) // cuerda 6 y grado 6
    const neutralMarkup = renderToStaticMarkup(<FretboardCard view="neutral" position={position} />)
    expect(neutralMarkup.match(/<circle /g)).toHaveLength(4)
    expect(neutralMarkup).not.toMatch(/card-reference|\bC6\b|grado|Referencia/)
  })

  it('recupera nombre, familia, fondo y borde de la calidad', () => {
    const markup = solution(byId('d3s1-m7-i3'))
    expect(markup).toContain('>Cm7<')
    expect(markup).toContain('>MENOR 7<')
    expect(markup).toContain(`fill="${QUALITY_COLORS.m7.background}"`)
    expect(markup).toContain(`stroke="${QUALITY_COLORS.m7.border}"`)
  })

  it('muestra el traste ancla solo en la tarjeta de solución', () => {
    const source = routesDocument.routes.find((route) => route.id === 'd2s2-major-i1')!.steps[0]!
    const shape = { ...source, anchorFret: 7 }
    const position = toPosition(shape, catalog)
    const markup = renderToStaticMarkup(
      <FretboardCard view="solution" position={position} solution={toSolution(shape, catalog)} />,
    )
    expect(markup).toContain('class="card-anchor-fret"')
    expect(markup).toContain('data-fret="7"')
    expect(markup).toContain(`fill="${QUALITY_COLORS.m7.border}"`)
    expect(markup).toContain('opacity="0.75"')
    expect(markup).toMatch(/card-fret-number[^>]*font-weight="700"[^>]*>7<\/text>/)
    expect(markup).toContain('Traste de referencia 7.')
    expect(renderToStaticMarkup(<FretboardCard view="neutral" position={position} />)).not.toContain('card-anchor-fret')
  })

  it('alinea las notas grises de referencia con la ventana ampliada por el ancla', () => {
    const source = byId('d2s1-maj7-i3')
    const shape = { ...transposeStudyVoicing(source, 0).shape, anchorFret: 1 }
    const position = toPosition(shape, catalog)
    const answer = toSolution(shape, catalog)
    const window = includeAnchorFret(position.window, answer.anchorFret)
    const expectedX = layoutCard(answer.referenceNotes ?? [], position.strings, window).dots[0]!.cx
    const markup = renderToStaticMarkup(<FretboardCard view="solution" position={position} solution={answer} />)
    const referenceX = Number(/<circle class="card-dot card-reference-dot"[^>]* cx="([^"]+)"/.exec(markup)![1])

    expect(window.start).toBeLessThan(position.window.start)
    expect(referenceX).toBe(expectedX)
  })

  it('pinta cada círculo con el color de la función de su grado en las 112 formas', () => {
    for (const voicing of playable) {
      const expected = voicing.notes.map((note) => DEGREE_COLORS[degreeFunction(note.degree)].fill)
      expect(dotFills(solution(voicing)), voicing.id).toEqual(expected)
    }
  })

  it('coincide con los colores y etiquetas de la plantilla (oráculos del DOM original)', () => {
    // [cuerda, etiqueta, color] tal como los pinta references/laminas-drop-original.html.
    const oracle: Record<string, [number, string, string][]> = {
      'd2s1-maj7-i0': [[4, '1', '#E11D48'], [3, '5', '#059669'], [2, '7', '#EDBC07'], [1, '3', '#0284C7']],
      'd3s1-m7-i3': [[5, 'b7', '#EDBC07'], [3, '5', '#059669'], [2, '1', '#E11D48'], [1, 'b3', '#0284C7']],
    }
    for (const [id, expected] of Object.entries(oracle)) {
      const voicing = byId(id)
      expect(voicing.notes.map((note) => [note.string, note.degree]), id).toEqual(expected.map(([string, label]) => [string, label]))
      expect(dotFills(solution(voicing)), id).toEqual(expected.map(([, , color]) => color))
    }
  })

  it('dibuja un bemol por cada alteración y no usa el carácter ♭', () => {
    const markup = solution(byId('d3s1-m7-i3'))
    const flats = [...markup.matchAll(/<path d="M0 -8 V3\.4/g)]
    expect(flats).toHaveLength(2)
    expect(markup).not.toContain('♭')
    const labels = [...markup.matchAll(/class="card-hand card-dot-label"[^>]*>([^<]*)</g)].map((match) => match[1])
    expect(labels).toEqual(['7', '5', '1', '3'])
  })

  it('su nombre accesible incluye nombre, inversión y grados dichos en voz alta', () => {
    const voicing = byId('d3s1-m7-i3')
    const label = /aria-label="([^"]*)"/.exec(solution(voicing))![1]!
    expect(label).toContain('Cm7, 3ª inversión')
    expect(label).toContain('grado bemol 7')
    expect(label).toContain('grado bemol 3')
    expect(spokenDegree('bb7')).toBe('doble bemol 7')
  })

  it('pone el bajo real como grado del bajo', () => {
    expect(toSolution(byId('d2s1-m7b5-i1'), catalog).bass).toBe('b3')
    expect(toSolution(byId('d2s1-maj7-i3'), catalog).bass).toBe('7')
  })
})
