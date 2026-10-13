import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import { configure, createSession } from '../session'
import { App } from './App'
import { MenuScreen } from './game/MenuScreen'

describe('menú de arranque', () => {
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

  it('enlaza con la pantalla de revisión de tarjetas e icono', () => {
    expect(html).toContain('<a href="#/revision">Revisar tarjetas e icono</a>')
  })

  it('permite elegir juego, Drop, set con sus cuerdas y dificultad (R01)', () => {
    for (const text of ['Reconocer voicings', 'Drop 2', 'Drop 3', 'Drop 2+4', 'Fácil', 'Medio', 'Difícil']) {
      expect(html).toContain(text)
    }
    // Solo los sets del Drop elegido, cada uno con sus cuerdas.
    expect(html).toContain('cuerdas 4-3-2-1')
    expect(html).toContain('cuerdas 5-4-3-2')
    expect(html).toContain('cuerdas 6-5-4-3')
    expect(html).not.toContain('cuerdas 5-3-2-1')
    expect(html).toContain('Empezar')
  })

  it('marca la configuración actual con aria-pressed', () => {
    expect(html).toMatch(/aria-pressed="true"[^>]*><span>Drop 2<\/span>/)
    expect(html).toMatch(/aria-pressed="true"[^>]*><span>Fácil<\/span>/)
  })

  it('cambia los sets al cambiar de Drop', () => {
    const state = configure(catalog, createSession(catalog), { drop: 'drop2+4' })
    if (state.phase !== 'menu') throw new Error('debería seguir en el menú')
    const markup = renderToStaticMarkup(<MenuScreen state={state} dispatch={() => undefined} newSeed={() => 1} />)
    expect(markup).toContain('cuerdas 5-4-2-1')
    expect(markup).toContain('cuerdas 6-5-3-2')
    expect(markup).not.toContain('cuerdas 4-3-2-1')
  })
})
