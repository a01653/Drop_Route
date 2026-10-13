import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../../data'
import { displayDegree } from '../card/model'
import { ReviewScreen } from './ReviewScreen'

describe('pantalla de revisión', () => {
  const html = renderToStaticMarkup(<ReviewScreen />)

  it('ofrece los siete sets y las dos vistas, con la neutra seleccionada', () => {
    expect(catalog.sets).toHaveLength(7)
    expect(html.match(/<button type="button" aria-pressed="(true|false)"/g)).toHaveLength(9)
    expect(html).toMatch(/aria-pressed="true"><span>Drop 2 · set 1/)
    expect(html).toMatch(/aria-pressed="true">Neutra</)
  })

  it('enseña las 16 tarjetas del set, sin nombres ni pistas en la vista neutra', () => {
    expect(html.match(/<li class="revision-tarjeta"/g)).toHaveLength(16)
    expect(html).toContain('Tarjetas (16)')
    expect(html).toContain('Tarjeta 1 de 16')
    const cards = html.slice(html.indexOf('<ol class="revision-rejilla"'), html.indexOf('</ol>'))
    expect(cards).not.toMatch(/maj7|m7b5|Cm7|C7|inversi|Fundamental|bajo:|MAYOR|DOMINANTE|MENOR/)
    expect(cards).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/i)
  })

  it('incluye el icono con su original y las exportaciones hasta 128 px', () => {
    expect(html).toContain('Icono de Drop Route, original SVG')
    for (const size of [16, 32, 48, 64, 128]) {
      expect(html).toContain(`Icono de ${size} píxeles sobre fondo claro`)
      expect(html).toContain(`Icono de ${size} píxeles sobre fondo oscuro`)
    }
  })

  it('devuelve al inicio', () => expect(html).toContain('<a href="#/">'))
})

describe('grados para texto de la interfaz', () => {
  it('escribe los bemoles como glifo', () => {
    expect(displayDegree('b3')).toBe('♭3')
    expect(displayDegree('bb7')).toBe('♭♭7')
    expect(displayDegree('5')).toBe('5')
  })
})
