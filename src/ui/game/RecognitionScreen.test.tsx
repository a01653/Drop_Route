import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../data'
import type { Inversion, QualityKey, SetId } from '../../data'
import { choose, configure, createSession, start, verify, voicingOf } from '../../session'
import type { QuestionState, VerifiedState } from '../../session'
import { RecognitionScreen } from './RecognitionScreen'

const noop = () => undefined
const open = (difficulty: 'easy' | 'medium', setId: SetId = 'D2S1', seed = 5): QuestionState => {
  const drop = catalog.sets.find((set) => set.id === setId)!.drop
  return start(catalog, configure(catalog, createSession(catalog), { drop, setId, difficulty }), seed) as QuestionState
}
const render = (state: QuestionState | VerifiedState) =>
  renderToStaticMarkup(<RecognitionScreen state={state} dispatch={noop} newSeed={() => 1} />)
const truth = (state: QuestionState) => voicingOf(catalog, state.question)
const answered = (state: QuestionState, quality: QualityKey, inversion?: Inversion) => {
  const withQuality = choose(state, { quality })
  const ready = inversion === undefined ? withQuality : choose(withQuality, { inversion })
  return verify(catalog, ready) as VerifiedState
}

describe('pregunta fácil (R03)', () => {
  const state = open('easy')
  const html = render(state)

  it('ofrece cuatro botones de acorde, sin desplegables', () => {
    const labels = [...html.matchAll(/aria-pressed="false"[^>]*>(Cmaj7|C7|Cm7|Cm7\(b5\))</g)].map((match) => match[1])
    expect([...labels].sort()).toEqual(['C7', 'Cm7', 'Cm7(b5)', 'Cmaj7'])
    expect(labels).toEqual(state.question.qualityOrder.map((quality) => catalog.qualities[quality].name))
    expect(html).not.toContain('<select')
  })

  it('Verificar está deshabilitado hasta elegir un acorde y la respuesta no se verifica sola', () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
    const chosen = render(choose(state, { quality: 'm7' }) as QuestionState)
    expect(chosen).toMatch(/aria-pressed="true"[^>]*>Cm7</)
    expect(chosen).not.toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
    expect(chosen).not.toContain('Siguiente')
    expect(chosen).not.toContain('Acierto')
  })
})

describe('pregunta media (R04)', () => {
  const state = open('medium')
  const html = render(state)

  it('ofrece dos desplegables, acorde e inversión, y ningún botón de acorde', () => {
    expect(html.match(/<select/g)).toHaveLength(2)
    for (const name of ['Cmaj7', 'C7', 'Cm7', 'Cm7(b5)', 'Fundamental', '1ª inversión', '2ª inversión', '3ª inversión']) {
      expect(html).toContain(`>${name}</option>`)
    }
    expect(html).not.toMatch(/aria-pressed/)
  })

  it('exige ambos campos antes de habilitar Verificar', () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
    expect(html).toContain('Elige acorde e inversión para verificar.')
    const halfway = render(choose(state, { quality: 'maj7' }) as QuestionState)
    expect(halfway).toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
    const both = render(choose(choose(state, { quality: 'maj7' }), { inversion: 2 }) as QuestionState)
    expect(both).not.toMatch(/<button[^>]*disabled=""[^>]*>Verificar<\/button>/)
  })
})

describe('la pregunta no da pistas (R02, R15)', () => {
  it('la tarjeta es neutra y nada del DOM revela acorde, inversión ni grados antes de verificar', () => {
    for (const difficulty of ['easy', 'medium'] as const) {
      for (const setId of catalog.sets.map((set) => set.id)) {
        for (let seed = 1; seed <= 6; seed += 1) {
          const state = open(difficulty, setId, seed)
          const html = render(state)
          const voicing = truth(state)
          expect(html, `${setId} ${difficulty}`).not.toContain(voicing.id)
          expect(html).not.toContain('card-name')
          expect(html).not.toContain('card-family')
          expect(html).not.toMatch(/data-(quality|voicing|id|inversion|degree)/)
          // Los círculos son todos grises y no hay etiquetas de grado.
          expect(html.match(/class="card-dot"/g)).toHaveLength(4)
          expect(html).not.toContain('card-dot-label')
          expect(html).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/i)
          // El nombre accesible de la tarjeta solo lista posiciones.
          const label = /<svg[^>]*aria-label="([^"]*)"/.exec(html)![1]!
          expect(label).toMatch(/^Posición de 4 notas: (cuerda \d, traste \d+(; )?)+\.$/)
        }
      }
    }
  })

  it('las opciones de acorde son las mismas cuatro para cualquier pregunta', () => {
    const names = (state: QuestionState) =>
      [...render(state).matchAll(/aria-pressed="false"[^>]*>(Cmaj7|C7|Cm7|Cm7\(b5\))</g)].map((match) => match[1]).sort()
    expect(names(open('easy', 'D2S1', 1))).toEqual(names(open('easy', 'D24S2', 77)))
  })
})

describe('verificación (R07, R08)', () => {
  it('acierto: bloquea la respuesta, conserva lo contestado y muestra la solución', () => {
    const state = open('medium')
    const voicing = truth(state)
    const done = answered(state, voicing.quality, voicing.inversion)
    const html = render(done)
    expect(html).toContain('Acierto completo')
    expect(html).toContain('Acorde: correcto.')
    expect(html).toContain('Inversión: correcto.')
    expect(html).toContain(`Solución: ${voicing.name}, ${catalog.inversions[voicing.inversion]}`)
    expect(html).toContain('card-name')
    expect(html).toContain('card-dot-label')
    expect(html.match(/<select[^>]*disabled=""/g)).toHaveLength(2)
    expect(html).toContain(`<option value="${voicing.quality}" selected="">`)
    expect(html).toContain('Siguiente')
    expect(html).not.toMatch(/>Verificar</)
  })

  it('error: marca cada campo con texto, símbolo y clase, y da la solución', () => {
    const state = open('medium')
    const voicing = truth(state)
    const wrongQuality = (voicing.quality === 'm7' ? 'maj7' : 'm7') as QualityKey
    const html = render(answered(state, wrongQuality, voicing.inversion))
    expect(html).toContain('Acierto parcial')
    expect(html).toMatch(/<li class="ko">[^]*?Acorde: incorrecto\.[^]*?Solución: /)
    expect(html).toMatch(/<li class="ok">[^]*?Inversión: correcto\./)
    expect(html).toContain('✗')
    expect(html).toContain('✓')
  })

  it('fácil fallido: el botón elegido queda marcado y se dice la solución', () => {
    const state = open('easy')
    const voicing = truth(state)
    const wrong = (voicing.quality === 'm7' ? 'maj7' : 'm7') as QualityKey
    const html = render(answered(state, wrong))
    expect(html).toContain('Incorrecto')
    expect(html).toMatch(/class="ko"[^>]*aria-pressed="true"[^>]*disabled=""/)
    expect(html).toContain(`Solución: ${voicing.name}.`)
    expect(html.match(/<button[^>]*disabled=""/g)!.length).toBeGreaterThanOrEqual(4)
  })
})

describe('fácil: marcas tras verificar (ajuste de revisión)', () => {
  const buttonOf = (html: string, name: string) =>
    new RegExp(`<button[^>]*>${name.replace(/[()]/g, '\\$&')}(?:<span[^>]*>[^<]*</span>)?</button>`).exec(html)![0]
  const wrongAnswer = () => {
    const state = open('easy')
    const voicing = truth(state)
    const wrong = state.question.qualityOrder.find((quality) => quality !== voicing.quality)!
    return { done: answered(state, wrong), voicing, wrong }
  }

  it('tras un error marca el elegido en rojo con ✗ y el correcto en verde con ✓', () => {
    const { done, voicing, wrong } = wrongAnswer()
    const html = render(done)
    const chosen = buttonOf(html, catalog.qualities[wrong].name)
    const correct = buttonOf(html, voicing.name)
    expect(chosen).toContain('class="ko"')
    expect(chosen).toContain('✗')
    expect(correct).toContain('class="ok"')
    expect(correct).toContain('✓')
  })

  it('solo el elegido conserva aria-pressed y los cuatro botones quedan bloqueados', () => {
    const { done, wrong } = wrongAnswer()
    const html = render(done)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(buttonOf(html, catalog.qualities[wrong].name)).toContain('aria-pressed="true"')
    const group = /<div class="opciones opciones-acorde"[^>]*>([^]*?)<\/div>/.exec(html)![1]!
    expect(group.match(/<button/g)).toHaveLength(4)
    expect(group.match(/disabled=""/g)).toHaveLength(4)
    expect(group.match(/class="(ok|ko)"/g)).toHaveLength(2)
  })

  it('tras un acierto solo se marca el elegido, en verde, y ningún otro botón', () => {
    const state = open('easy')
    const voicing = truth(state)
    const html = render(answered(state, voicing.quality))
    expect(html.match(/class="ok"[^>]*aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/✓/g)!.length).toBeGreaterThanOrEqual(1)
    expect(html).not.toContain('class="ko"')
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  })

  it('el botón correcto lleva una descripción accesible, no un cambio de nombre', () => {
    const { done, voicing } = wrongAnswer()
    const html = render(done)
    expect(buttonOf(html, voicing.name)).toMatch(/aria-describedby="[^"]+"/)
    expect(html).toContain('Respuesta correcta')
    expect(html).toContain('Tu respuesta, incorrecta')
  })

  it('antes de verificar no hay ninguna marca ni descripción que dé pistas', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const state = open('easy', 'D3S1', seed)
      const chosen = choose(state, { quality: state.question.qualityOrder[0]! }) as QuestionState
      for (const html of [render(state), render(chosen)]) {
        const group = /<div class="opciones opciones-acorde"[^>]*>([^]*?)<\/div>/.exec(html)![1]!
        expect(group).not.toMatch(/class="(ok|ko)"/)
        expect(group).not.toMatch(/✓|✗|aria-describedby|disabled/)
        expect(html).not.toContain('Respuesta correcta')
      }
    }
  })
})
