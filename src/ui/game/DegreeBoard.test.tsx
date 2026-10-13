import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../data'
import type { Degree, SetId } from '../../data'
import { DEGREE_BANK, choose, configure, createSession, moveDegree, start, verify, voicingOf } from '../../session'
import type { QuestionState, SessionState, VerifiedState } from '../../session'
import { RecognitionScreen } from './RecognitionScreen'

const noop = () => undefined
const hard = (setId: SetId = 'D2S1', seed = 5): QuestionState => {
  const drop = catalog.sets.find((set) => set.id === setId)!.drop
  return start(catalog, configure(catalog, createSession(catalog), { drop, setId, difficulty: 'hard' }), seed) as QuestionState
}
const render = (state: QuestionState | VerifiedState) =>
  renderToStaticMarkup(<RecognitionScreen state={state} dispatch={noop} newSeed={() => 1} />)
const place = (state: SessionState, degree: Degree, slot: number) =>
  moveDegree(moveDegree(state, { type: 'pick-bank', degree }), { type: 'drop-slot', slot })

describe('pregunta difícil (R05)', () => {
  const html = render(hard())

  it('muestra cuatro destinos sobre la tarjeta, el banco fijo y los dos desplegables', () => {
    expect(html.match(/data-destino="\d"/g)).toHaveLength(4)
    expect(html.match(/class="ficha"/g)).toHaveLength(DEGREE_BANK.length)
    expect(html.match(/<select/g)).toHaveLength(2)
    expect(html).toContain('Banco de grados')
    expect(html).toContain('Devolver al banco')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
    expect(html).toContain('Elige acorde e inversión y coloca los cuatro grados para verificar.')
  })

  it('el banco es el mismo en todas las preguntas y no se reduce a los grados correctos', () => {
    const bank = (state: QuestionState) =>
      [...render(state).matchAll(/class="ficha"[^>]*aria-label="Grado ([^"]+)"/g)].map((match) => match[1])
    const expected = ['1', '3', 'bemol 3', '5', 'bemol 5', '7', 'bemol 7']
    for (const [setId, seed] of [['D2S1', 1], ['D3S2', 9], ['D24S2', 33]] as const) {
      const state = hard(setId, seed)
      expect(bank(state), setId).toEqual(expected)
      expect(bank(state).length).toBeGreaterThan(voicingOf(catalog, state.question).notes.length)
    }
  })

  it('los destinos vacíos solo nombran su posición: nada revela la solución', () => {
    for (const setId of catalog.sets.map((set) => set.id)) {
      const state = hard(setId, 4)
      const page = render(state)
      const voicing = voicingOf(catalog, state.question)
      expect(page).not.toContain(voicing.id)
      expect(page).not.toContain('card-name')
      expect(page).not.toContain('card-dot-label')
      expect(page).not.toMatch(/data-(quality|voicing|id|inversion|degree)/)
      const labels = [...page.matchAll(/aria-label="(Círculo \d[^"]*)"/g)].map((match) => match[1]!)
      expect(labels).toHaveLength(4)
      for (const label of labels) expect(label).toMatch(/^Círculo \d: cuerda \d, traste \d+, vacío$/)
    }
  })

  it('un grado colocado sale del banco, aparece en su círculo y no hay duplicados', () => {
    let state: SessionState = hard()
    state = place(state, 'b3', 2)
    const page = render(state as QuestionState)
    expect(page).toMatch(/aria-label="Grado bemol 3, colocado"/)
    expect(page.match(/Grado bemol 3, colocado/g)).toHaveLength(1)
    expect(page).toMatch(/aria-label="Círculo 3: cuerda \d, traste \d+, grado bemol 3"/)
  })

  it('con una ficha en la mano dice qué hacer y habilita devolverla si viene de un destino', () => {
    let state: SessionState = place(hard(), '5', 1)
    state = moveDegree(state, { type: 'pick-slot', slot: 1 })
    const page = render(state as QuestionState)
    expect(page).toContain('Grado 5 del círculo 2 en la mano')
    expect(page).not.toMatch(/<button[^>]*disabled=""[^>]*>Devolver al banco<\/button>/)
    expect(page).toMatch(/aria-pressed="true"[^>]*aria-label="Círculo 2/)
  })
})

describe('corrección difícil (R07, R08)', () => {
  const complete = (state: QuestionState, wrongSlot: number | null) => {
    const voicing = voicingOf(catalog, state.question)
    const spare = DEGREE_BANK.find((degree) => !voicing.notes.some((note) => note.degree === degree))!
    let current: SessionState = choose(choose(state, { quality: voicing.quality }), { inversion: voicing.inversion })
    voicing.notes.forEach((note, slot) => {
      current = place(current, slot === wrongSlot ? spare : note.degree, slot)
    })
    return { done: verify(catalog, current) as VerifiedState, voicing }
  }

  it('acierto completo: seis campos correctos y solución con colores', () => {
    const { done, voicing } = complete(hard(), null)
    const page = render(done)
    expect(page).toContain('Acierto completo')
    expect(page).toContain('6 de 6 campos correctos.')
    expect(page.match(/<li class="ok">/g)).toHaveLength(6)
    expect(page).toContain('card-name')
    expect(page).toContain(`Solución: ${voicing.name}`)
    expect(page).not.toContain('data-destino')
    expect(page).not.toContain('Banco de grados')
  })

  it('un grado equivocado se marca solo en su círculo y conserva el resto de aciertos', () => {
    const { done, voicing } = complete(hard('D3S1', 12), 1)
    const page = render(done)
    expect(page).toContain('Acierto parcial')
    expect(page).toContain('5 de 6 campos correctos.')
    expect(page.match(/<li class="ko">/g)).toHaveLength(1)
    const note = voicing.notes[1]!
    expect(page).toMatch(
      new RegExp(`<li class="ko">[^]*?Círculo 2 \\(cuerda ${note.string}, traste ${note.fret}\\): incorrecto\\.[^]*?Solución: `),
    )
  })

  it('b3, b5 y b7 se corrigen como grados distintos de 3, 5 y 7', () => {
    const state = hard('D2S1', 5)
    const voicing = voicingOf(catalog, state.question)
    let current: SessionState = choose(choose(state, { quality: voicing.quality }), { inversion: voicing.inversion })
    const altered = (degree: Degree): Degree => (degree.startsWith('b') ? (degree.slice(1) as Degree) : degree)
    voicing.notes.forEach((note, slot) => {
      current = place(current, altered(note.degree), slot)
    })
    const done = verify(catalog, current) as VerifiedState
    const flats = voicing.notes.filter((note) => note.degree.startsWith('b')).length
    expect(done.result.fields.filter((item) => item.field === 'degree' && !item.correct)).toHaveLength(flats)
  })
})
