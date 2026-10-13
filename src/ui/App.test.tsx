import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('pantalla de arranque', () => {
  const html = renderToStaticMarkup(<App />)

  it('muestra el nombre y el estado de desarrollo', () => {
    expect(html).toContain('<h1>Drop Route</h1>')
    expect(html).toContain('En desarrollo.')
  })

  it('resume los datos cargados desde la capa de datos', () => {
    expect(html).toContain('<dt>Posiciones de juego</dt><dd>112</dd>')
    expect(html).toContain('<dt>Posiciones de referencia</dt><dd>12</dd>')
    expect(html).toContain('<dt>Rutas II-V-I</dt><dd>16</dd>')
  })

  it('no ofrece todavía controles de juego', () => {
    expect(html).not.toMatch(/<(button|select|input)\b/)
  })
})
