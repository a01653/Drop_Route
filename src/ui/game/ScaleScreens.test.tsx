import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../data'
import {
  createSession,
  expectedOrder,
  markedDegrees,
  placedPatternOf,
  reduceSession,
} from '../../session'
import type { GameConfig, OrderQuestionState, OrderVerifiedState, ScaleQuestionState, ScaleVerifiedState, SessionAction, SessionState } from '../../session'
import { ScalePatternCard } from '../card/ScalePatternCard'
import { NEUTRAL_COLORS, DEGREE_COLORS } from '../card/palette'
import { MenuScreen } from './MenuScreen'
import { ScaleOrderScreen, ScaleOrderSummaryScreen } from './ScaleOrderScreen'
import { ScalePatternScreen, ScaleSummaryScreen } from './ScalePatternScreen'

const noop = () => undefined
const run = (state: SessionState, ...actions: SessionAction[]) => actions.reduce((current, action) => reduceSession(catalog, current, action), state)
const menu = (change: Partial<GameConfig>): SessionState => ({ phase: 'menu', config: { ...createSession(catalog).config, ...change } })
const renderPattern = (state: ScaleQuestionState | ScaleVerifiedState) =>
  renderToStaticMarkup(<ScalePatternScreen state={state} dispatch={noop} newSeed={() => 1} />)
const renderOrder = (state: OrderQuestionState | OrderVerifiedState) =>
  renderToStaticMarkup(<ScaleOrderScreen state={state} dispatch={noop} newSeed={() => 1} />)
const svgLabels = (html: string) => [...html.matchAll(/<svg[^>]*aria-label="([^"]*)"/g)].map((match) => match[1]!)

describe('menú de los juegos de escalas', () => {
  it('pide escala y tonalidad, con Aleatoria, y no Drop ni set', () => {
    const html = renderToStaticMarkup(<MenuScreen state={menu({ game: 'scale-patterns' }) as never} dispatch={noop} newSeed={() => 1} />)
    for (const label of ['Escala', 'Tonalidad', 'Dificultad', 'Pentatónica menor', 'Menor natural', 'Aleatoria']) expect(html).toContain(label)
    expect(html).not.toContain('Set de cuerdas')
    const order = renderToStaticMarkup(<MenuScreen state={menu({ game: 'scale-order' }) as never} dispatch={noop} newSeed={() => 1} />)
    expect(order).not.toContain('Dificultad')
    expect(order).toContain('no muestran los trastes')
  })
})

describe('Reconocer patrones', () => {
  const open = (difficulty: 'easy' | 'medium' | 'hard') =>
    run(menu({ game: 'scale-patterns', scaleId: 'major-pentatonic', scaleKey: 7, difficulty }), { type: 'start', seed: 3 }) as ScaleQuestionState

  it('la pregunta es neutra: círculos grises, sin grados, colores musicales ni nombre del patrón', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const html = renderPattern(open(difficulty))
      expect(html).toContain('Tónica: G')
      expect(html).not.toContain('FORMA')
      expect(html).not.toContain('data-degree')
      for (const color of Object.values(DEGREE_COLORS)) expect(html).not.toContain(color.fill)
      expect(html).toContain(NEUTRAL_COLORS.dotFill)
      expect(svgLabels(html).join(' ')).not.toMatch(/grado/)
    }
  })

  it('Medio ofrece un botón por nota; Difícil, además, el banco fijo de grados', () => {
    const medium = open('medium')
    const notes = placedPatternOf(medium.question).notes.length
    expect(renderPattern(medium).match(/data-nota=/g)).toHaveLength(notes)
    const hard = renderPattern(open('hard'))
    for (const degree of ['1', '♭3', '3', '5', '6', '♭7', '7', 'Borrar']) expect(hard).toContain(`>${degree}</button>`)
  })

  it('tras verificar muestra la solución con colores, la corrección por campos y tus marcas', () => {
    const state = open('medium')
    const tonic = placedPatternOf(state.question).notes.findIndex((note) => note.degree === '1')
    const verified = run(state, { type: 'scale-pattern', pattern: state.question.pattern }, { type: 'scale-mark', index: tonic, degree: '1' }, { type: 'verify' }) as ScaleVerifiedState
    const html = renderPattern(verified)
    expect(html).toContain('Acierto parcial')
    expect(html).toContain('Patrón: correcto')
    expect(html).toContain('Tónicas: incorrecto')
    expect(html).toContain('Faltan:')
    expect(html).toContain('revision-ok')
    expect(html).toContain('revision-falta')
    expect(html).toContain(DEGREE_COLORS.root.fill)
    expect(html).toContain('Siguiente')
  })

  it('la revisión final incluye las preguntas sin verificar', () => {
    const state = run(open('easy'), { type: 'finish-test' })
    if (state.phase !== 'escala-resumen') throw new Error('fase inesperada')
    const html = renderToStaticMarkup(<ScaleSummaryScreen state={state} dispatch={noop} />)
    expect(html).toContain('Sin verificar')
    expect(html).toContain('0 de 1 respuestas completas')
  })

  it('pide todas las tónicas, terceras, quintas y séptimas, o sextas en la pentatónica mayor', () => {
    expect(markedDegrees('major-pentatonic', 'hard')).toEqual(['1', '3', '5', '6'])
    expect(renderPattern(open('hard'))).toContain('Marca todas las notas que sean 1, 3, 5, 6.')
  })
})

describe('Ordenar patrones', () => {
  const open = () => run(menu({ game: 'scale-order', scaleId: 'minor-pentatonic', scaleKey: 4 }), { type: 'start', seed: 2 }) as OrderQuestionState

  it('las tarjetas no muestran trastes, cejuelo ni grados, y su nombre accesible no dice los trastes', () => {
    const html = renderOrder(open())
    expect(html).not.toContain('card-fret-number')
    expect(html).not.toContain('card-nut')
    expect(html).not.toContain('data-degree')
    const labels = svgLabels(html)
    expect(labels).toHaveLength(5)
    for (const label of labels) {
      expect(label).not.toMatch(/traste/)
      expect(label).toMatch(/columna 1/)
    }
  })

  it('tras verificar corrige puesto a puesto y enseña el orden correcto con trastes', () => {
    const state = open()
    const right = expectedOrder(state.question).map((number) => state.question.cards.indexOf(number))
    const verified = run(state, ...right.map((card): SessionAction => ({ type: 'order-pick', card })), { type: 'verify' }) as OrderVerifiedState
    const html = renderOrder(verified)
    expect(html).toContain('Orden correcto')
    expect(html).toContain('De grave a agudo en E: 1 – 2 – 3 – 4 – 5.')
    expect(html.match(/correcto\.<\/strong>/g)).toHaveLength(5)
    expect(html).toContain('card-fret-number')
    const summary = run(verified, { type: 'finish-test' })
    if (summary.phase !== 'orden-resumen') throw new Error('fase inesperada')
    expect(renderToStaticMarkup(<ScaleOrderSummaryScreen state={summary} dispatch={noop} />)).toContain('1 de 1 órdenes correctos')
  })
})

describe('tarjeta de patrón', () => {
  it('la vista de solución lleva grados y la neutra solo posiciones', () => {
    const notes = placedPatternOf({ scaleId: 'major', tonicPc: 0, pattern: 3 }).notes
    const solution = renderToStaticMarkup(
      <ScalePatternCard view="solution" notes={notes} name="Patrón 3" family="FORMA C" targets={['1', '3', '5', '7']} minor={false} label="Mayor de C" />,
    )
    expect(solution).toContain('Patrón 3')
    expect(solution.match(/data-degree=/g)).toHaveLength(notes.length)
    const neutral = renderToStaticMarkup(<ScalePatternCard view="neutral" notes={notes} />)
    expect(neutral).not.toContain('Patrón 3')
    expect(svgLabels(neutral)[0]).toMatch(/^Patrón de 17 notas: cuerda 6, traste 0;/)
  })
})
