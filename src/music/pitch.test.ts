import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../data'
import type { Voicing } from '../data'
import { inversionFromBass, midiOf, pitchClass } from './pitch'

const find = (id: string): Voicing => {
  const voicing = catalog.voicings.find((item) => item.id === id)
  if (!voicing) throw new Error(`Falta la posición ${id}`)
  return voicing
}

describe('alturas físicas', () => {
  it('suma el traste al MIDI de la cuerda al aire (EADGBE)', () => {
    expect(midiOf({ string: 6, fret: 0 }, catalog.tuning)).toBe(40)
    expect(midiOf({ string: 1, fret: 0 }, catalog.tuning)).toBe(64)
    expect(midiOf({ string: 4, fret: 10 }, catalog.tuning)).toBe(60)
  })

  it('reduce a clase de altura también con diferencias negativas', () => {
    expect(pitchClass(60)).toBe(0)
    expect(pitchClass(-1)).toBe(11)
  })
})

describe('inversión por bajo real', () => {
  it('concuerda con las 124 posiciones del catálogo', () => {
    for (const voicing of catalog.voicings) {
      expect(inversionFromBass(voicing, catalog), voicing.id).toBe(voicing.inversion)
    }
  })

  it('concuerda con los 48 pasos de las 16 rutas', () => {
    let steps = 0
    for (const route of routesDocument.routes) {
      for (const step of route.steps) {
        steps += 1
        expect(inversionFromBass(step, catalog), `${route.id} ${step.function}`).toBe(
          step.inversion,
        )
      }
    }
    expect(steps).toBe(48)
  })

  it('no depende del orden del array de notas', () => {
    const voicing = find('d2s1-maj7-i1')
    const reversed = { ...voicing, notes: [...voicing.notes].reverse() }
    expect(inversionFromBass(reversed, catalog)).toBe(1)
  })

  it('detecta un bajo desplazado un semitono', () => {
    const voicing = find('d2s1-maj7-i0')
    const [bass, ...rest] = voicing.notes
    if (!bass) throw new Error('La posición no tiene notas')
    const moved = { ...voicing, notes: [{ ...bass, fret: bass.fret + 1 }, ...rest] }
    expect(inversionFromBass(moved, catalog)).toBeNull()
  })
})
