import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../../data'
import type { SetId } from '../../data'
import {
  configure,
  createSession,
  next,
  selectCandidate,
  start,
  verify,
  answerStep,
  startStep,
} from '../../session'
import type { RouteMode, RouteQuestionState, RouteStretch, RouteVerifiedState, SessionState } from '../../session'
import { MenuScreen } from './MenuScreen'
import { RouteScreen } from './RouteScreen'

const noop = () => undefined
const begin = (setId: SetId, mode: RouteMode, stretch: RouteStretch, seed = 5): RouteQuestionState => {
  const menu = configure(catalog, createSession(catalog), { game: 'routes', drop: 'drop2', setId, routeMode: mode, stretch })
  return start(catalog, menu, seed) as RouteQuestionState
}
const render = (state: RouteQuestionState | RouteVerifiedState) =>
  renderToStaticMarkup(<RouteScreen state={state} dispatch={noop} newSeed={() => 1} />)
const section = (html: string, className: string) =>
  new RegExp(`<section class="${className}"[^>]*>([^]*?)</section>`).exec(html)?.[1] ?? ''
const rightIndex = (state: RouteQuestionState) => state.question.candidateRouteIds.indexOf(state.question.routeId)

describe('menú de rutas (R11)', () => {
  const menu = configure(catalog, createSession(catalog), { game: 'routes' })
  if (menu.phase !== 'menu') throw new Error('debería seguir en el menú')
  const html = renderToStaticMarkup(<MenuScreen state={menu} dispatch={noop} newSeed={() => 1} />)

  it('ofrece solo Drop 2 con sus dos sets, el modo y el tramo, y no la dificultad', () => {
    expect(html).toContain('Rutas II-V-I')
    expect(html).toMatch(/aria-pressed="true"[^>]*><span>Rutas II-V-I<\/span>/)
    expect(html).toContain('cuerdas 4-3-2-1')
    expect(html).toContain('cuerdas 5-4-3-2')
    expect(html).not.toContain('cuerdas 6-5-4-3')
    expect(html).not.toContain('Drop 3')
    expect(html).not.toContain('Drop 2+4')
    for (const text of ['Mayor', 'Dm7 · G7 · Cmaj7', 'Menor', 'Dm7(♭5) · G7 · Cm7', 'II → V', 'V → I', 'II → V → I']) {
      expect(html).toContain(text)
    }
    expect(html).not.toContain('Dificultad')
  })

  it('el reconocimiento sigue ofreciendo todas las familias y la dificultad', () => {
    const recognition = createSession(catalog)
    const page = renderToStaticMarkup(<MenuScreen state={recognition} dispatch={noop} newSeed={() => 1} />)
    for (const text of ['Drop 3', 'Drop 2+4', 'Dificultad', 'Fácil']) expect(page).toContain(text)
    expect(page).not.toContain('Tramo')
  })
})

describe('pregunta de ruta (R12)', () => {
  it('muestra la partida con su nombre y una sola candidata neutra, con el selector 1 a 4 y Verificar', () => {
    const state = begin('D2S1', 'major', 'ii-v')
    const html = render(state)
    expect(html).toContain('Partida')
    expect(html).toContain('Partida: Dm7,')
    expect(html).toContain('¿Qué G7 continúa la ruta?')
    expect(html.match(/<svg/g)).toHaveLength(2)
    expect(html.match(/aria-label="Candidata [1-4]"/g)).toHaveLength(4)
    expect(html).toContain('Candidata 1 de 4')
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Candidata 1"/)
    expect(html).toContain('>Verificar<')
  })

  it('la candidata es neutra: solo posiciones, sin nombre, grados, colores ni identificadores', () => {
    for (const setId of ['D2S1', 'D2S2'] as const) {
      for (const mode of ['major', 'minor'] as const) {
        for (const stretch of ['ii-v', 'v-i'] as const) {
          for (let seed = 1; seed <= 4; seed += 1) {
            const state = begin(setId, mode, stretch, seed)
            for (let index = 0; index < 4; index += 1) {
              const html = render(selectCandidate(state, index) as RouteQuestionState)
              const candidate = section(html, 'candidata')
              const label = `${setId} ${mode} ${stretch}`
              expect(candidate, label).not.toContain('card-name')
              expect(candidate).not.toContain('card-dot-label')
              expect(candidate).not.toMatch(/data-(route|quality|inversion|id)/)
              expect(candidate).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/i)
              expect(candidate).not.toContain(state.question.routeId)
              const aria = /<svg[^>]*aria-label="([^"]*)"/.exec(candidate)![1]!
              expect(aria).toMatch(/^Posición de 4 notas: (cuerda \d, traste \d+(; )?)+\.$/)
            }
          }
        }
      }
    }
  })

  it('cambiar de candidata dibuja otra posición y la partida no cambia', () => {
    const state = begin('D2S2', 'minor', 'ii-v', 7)
    const labels = new Set<string>()
    const starts = new Set<string>()
    for (let index = 0; index < 4; index += 1) {
      const html = render(selectCandidate(state, index) as RouteQuestionState)
      labels.add(/<svg[^>]*aria-label="([^"]*)"/.exec(section(html, 'candidata'))![1]!)
      starts.add(/<svg[^>]*aria-label="([^"]*)"/.exec(section(html, 'partida'))![1]!)
      expect(html).toContain(`Candidata ${index + 1} de 4`)
    }
    expect(labels.size).toBe(4)
    expect(starts.size).toBe(1)
  })

  it('el tramo V-I parte del V y pregunta el I de la modalidad', () => {
    const major = render(begin('D2S1', 'major', 'v-i'))
    expect(major).toContain('Partida: G7,')
    expect(major).toContain('¿Qué Cmaj7 continúa la ruta?')
    const minor = render(begin('D2S1', 'minor', 'v-i'))
    expect(minor).toContain('¿Qué Cm7 continúa la ruta?')
    expect(minor).not.toMatch(/Cm\(maj7\)|Cm6/)
  })

  it('en el menor la partida del tramo II-V es Dm7(♭5) escrito como en los datos', () => {
    expect(render(begin('D2S1', 'minor', 'ii-v'))).toContain('Partida: Dm7(b5),')
  })
})

describe('verificación de ruta (R13)', () => {
  const finish = (state: RouteQuestionState, index: number) => verify(catalog, selectCandidate(state, index)) as RouteVerifiedState

  it('acierto: dice que es la de nuestra ruta y muestra Tu respuesta / Solución de una en una', () => {
    const state = begin('D2S1', 'major', 'ii-v')
    const html = render(finish(state, rightIndex(state)))
    expect(html).toContain('Es la de nuestra ruta')
    expect(html).toContain('✓')
    expect(html).toContain('>Tu respuesta<')
    expect(html).toContain('>Solución<')
    expect(html).toContain('Siguiente')
    expect(html).not.toContain('Candidata 1 de 4')
    expect(html).not.toContain('>Verificar<')
    // Dos diagramas como máximo: la partida y uno de los dos del comparador.
    expect(html.match(/<svg/g)).toHaveLength(2)
  })

  it('otra posición válida no se declara incorrecta ni musicalmente errónea', () => {
    const state = begin('D2S1', 'major', 'ii-v')
    const wrong = (rightIndex(state) + 1) % 4
    const html = render(finish(state, wrong))
    expect(html).toContain('No es la de nuestra ruta')
    expect(html).toContain('Es otra posición válida de G7, pero esta ruta usa')
    expect(html).toContain('✗')
    expect(html).not.toMatch(/incorrect|error|mal\b|equivocad|fallo/i)
    expect(html.match(/<svg/g)).toHaveLength(2)
  })

  describe('selector tras verificar', () => {
    const selectorHtml = (html: string) => /<div class="selector"[^>]*>([^]*?)<\/div>/.exec(html)![1]!
    const buttons = (html: string) => [...selectorHtml(html).matchAll(/<button[^>]*>[^]*?<\/button>/g)].map((match) => match[0])
    const noteOf = (html: string, button: string) => {
      const id = /aria-describedby="([^"]+)"/.exec(button)?.[1]
      return id ? new RegExp(`<span class="solo-lectores" id="${id}">([^<]*)</span>`).exec(selectorHtml(html))?.[1] : undefined
    }

    it('antes de verificar: cuatro botones sin marcas, sin descripciones y solo la elegida con aria-pressed', () => {
      const state = begin('D2S1', 'major', 'ii-v')
      for (const html of [render(state), render(selectCandidate(state, 2) as RouteQuestionState)]) {
        const group = buttons(html)
        expect(group).toHaveLength(4)
        for (const button of group) expect(button).not.toMatch(/class="|✓|✗|aria-describedby|disabled/)
        expect(group.filter((button) => button.includes('aria-pressed="true"'))).toHaveLength(1)
        expect(selectorHtml(html)).not.toContain('solo-lectores')
      }
    })

    it('fallo: la elegida en rojo con ✗ y la de nuestra ruta en verde con ✓, cuatro botones bloqueados', () => {
      const state = begin('D2S1', 'major', 'ii-v')
      const right = rightIndex(state)
      const wrong = (right + 1) % 4
      const html = render(finish(state, wrong))
      const group = buttons(html)
      expect(group).toHaveLength(4)
      expect(group.filter((button) => button.includes('disabled=""'))).toHaveLength(4)
      expect(group.filter((button) => button.includes('aria-pressed="true"'))).toHaveLength(1)
      expect(group[wrong]).toMatch(/class="ko"[^>]*aria-pressed="true"/)
      expect(group[wrong]).toContain('✗')
      expect(group[right]).toMatch(/class="ok"[^>]*aria-pressed="false"/)
      expect(group[right]).toContain('✓')
      group.forEach((button, index) => {
        if (index !== right && index !== wrong) expect(button).not.toMatch(/class="|✓|✗|aria-describedby/)
        expect(button).toContain(`aria-label="Candidata ${index + 1}"`)
      })
      expect(noteOf(html, group[wrong]!)).toBe('Tu respuesta, no es la de nuestra ruta')
      expect(noteOf(html, group[right]!)).toBe('La de nuestra ruta')
      expect(html.match(/class="ko"/g)).toHaveLength(1)
    })

    it('acierto: solo la elegida, en verde con ✓ y descrita como la de nuestra ruta; ninguna roja', () => {
      const state = begin('D2S2', 'minor', 'v-i', 3)
      const right = rightIndex(state)
      const html = render(finish(state, right))
      const group = buttons(html)
      expect(group[right]).toMatch(/class="ok"[^>]*aria-pressed="true"/)
      expect(group[right]).toContain('✓')
      expect(noteOf(html, group[right]!)).toBe('Tu respuesta, la de nuestra ruta')
      expect(group.filter((button) => button.includes('class='))).toHaveLength(1)
      expect(group.filter((button) => button.includes('disabled=""'))).toHaveLength(4)
      expect(html).not.toContain('class="ko"')
      expect(html).not.toContain('✗')
    })

    it('el rojo no se describe como error musical: el texto habla de nuestra ruta', () => {
      const state = begin('D2S1', 'minor', 'ii-v', 4)
      const html = render(finish(state, (rightIndex(state) + 3) % 4))
      expect(selectorHtml(html)).not.toMatch(/incorrect|error|mal\b|equivocad|fallo|inválid/i)
      expect(html).toContain('Es otra posición válida de G7')
    })

    it('la tarjeta de la candidata neutra desaparece y los diagramas siguen siendo dos con los colores musicales', () => {
      const state = begin('D2S1', 'major', 'ii-v')
      const html = render(finish(state, (rightIndex(state) + 1) % 4))
      expect(html.match(/<svg/g)).toHaveLength(2)
      expect(html).not.toContain('class="candidata"')
      expect(html).toMatch(/#E11D48/i)
    })

    it('Siguiente devuelve una pregunta neutra con el selector desbloqueado y sin marcas', () => {
      const state = begin('D2S1', 'major', 'ii-v')
      const chained = next(catalog, finish(state, (rightIndex(state) + 1) % 4), 8) as SessionState as RouteQuestionState
      expect(chained.phase).toBe('ruta')
      const html = render(chained)
      for (const button of buttons(html)) expect(button).not.toMatch(/class="|✓|✗|aria-describedby|disabled/)
      expect(selectorHtml(html)).not.toContain('solo-lectores')
      expect(html).toContain('>Verificar<')
      expect(section(html, 'candidata')).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/i)
    })
  })

  it('el comparador muestra la solución de nuestra ruta por defecto', () => {
    const state = begin('D2S2', 'major', 'ii-v', 11)
    const html = render(finish(state, (rightIndex(state) + 2) % 4))
    expect(html).toContain('Solución de nuestra ruta: G7,')
    expect(html).toMatch(/aria-pressed="true">Solución</)
  })

  it('II → V → I: tras el V el botón anuncia el tramo V → I', () => {
    const state = begin('D2S1', 'major', 'both')
    expect(render(finish(state, 0))).toContain('Siguiente: V → I')
    const chained = next(catalog, finish(state, 0), 3) as SessionState as RouteQuestionState
    expect(render(finish(chained, 0))).not.toContain('Siguiente: V')
  })

  it('la partida de la pregunta es el paso de nuestra ruta y la respuesta, el siguiente', () => {
    const state = begin('D2S1', 'minor', 'ii-v', 9)
    expect(startStep(routesDocument, state.question).function).toBe('ii')
    expect(answerStep(routesDocument, state.question).function).toBe('V')
  })
})
