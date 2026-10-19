import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import { configure, createSession } from '../session'
import { App } from './App'
import { MenuScreen } from './game/MenuScreen'
import { version } from '../../package.json'

describe('menú de arranque', () => {
  const html = renderToStaticMarkup(<App />)

  it('muestra el nombre sin el bloque informativo de versión', () => {
    expect(html).toContain('<h1>Drop Route</h1>')
    expect(html).not.toContain('Versión actual')
    expect(html).not.toContain('estudiar las formas sin examen')
  })

  it('muestra la versión del paquete en una etiqueta pequeña', () => {
    expect(html).toContain('aria-label="Versión de Drop Route"')
    expect(html).toContain(`v${version}`)
    expect(html).not.toContain('Versión actual')
  })

  it('muestra la autoría junto a la versión en la parte superior', () => {
    expect(html).toContain('<span class="app-author">Creado por Jesús Quevedo Rodríguez</span>')
    expect(html).toContain('<span class="app-version" aria-label="Versión de Drop Route">v')
    expect(html).not.toContain('<footer class="app-author">')
  })

  it('muestra el progreso sin las cifras del bloque informativo eliminado', () => {
    expect(html).toContain('Tu progreso')
    expect(html).not.toContain('Posiciones de juego')
    expect(html).not.toContain('Posiciones de referencia')
    expect(html).not.toContain('Datos cargados desde la plantilla original')
  })

  it('enlaza con estudio sin mostrar el acceso de revisión de tarjetas e icono', () => {
    expect(html).toContain('<a class="boton-secundario menu-estudio" href="#/study">Modo estudio</a>')
    expect(html).not.toContain('Revisar tarjetas e icono')
    expect(html).not.toContain('href="#/revision"')
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
