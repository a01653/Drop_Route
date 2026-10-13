import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { Degree } from '../data'
import { DEGREE_BANK, SLOT_COUNT, applyDegreeAction, bankRemaining, newSlots } from './degrees'
import type { DegreeAction, DegreeBoard } from './degrees'
import { createRng } from './rng'

const board = (slots: (Degree | null)[] = newSlots(), held: DegreeBoard['held'] = null): DegreeBoard => ({ slots, held })
const run = (start: DegreeBoard, ...actions: DegreeAction[]) => actions.reduce(applyDegreeAction, start)

describe('banco fijo de grados', () => {
  const evaluable = catalog.voicings.filter((voicing) => voicing.quizEnabled)

  it('no tiene grados duplicados y es mayor que los cuatro destinos', () => {
    expect(new Set(DEGREE_BANK).size).toBe(DEGREE_BANK.length)
    expect(DEGREE_BANK.length).toBeGreaterThan(SLOT_COUNT)
  })

  it('incluye b3, b5 y b7 reales además de 3, 5 y 7, y no ofrece el bb7 de la disminuida', () => {
    for (const degree of ['1', '3', 'b3', '5', 'b5', '7', 'b7'] as Degree[]) expect(DEGREE_BANK).toContain(degree)
    expect(DEGREE_BANK).not.toContain('bb7')
  })

  it('contiene todos los grados de las 112 formas y nunca solo los cuatro correctos', () => {
    for (const voicing of evaluable) {
      for (const note of voicing.notes) expect(DEGREE_BANK, voicing.id).toContain(note.degree)
      expect(DEGREE_BANK.length, voicing.id).toBeGreaterThan(voicing.notes.length)
      // Los grados que sobran existen: el banco no coincide con la solución de ninguna forma.
      expect(new Set(DEGREE_BANK).size - new Set(voicing.notes.map((note) => note.degree)).size, voicing.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('todas las formas evaluables necesitan exactamente los cuatro destinos', () => {
    for (const voicing of evaluable) expect(voicing.notes, voicing.id).toHaveLength(SLOT_COUNT)
  })
})

describe('colocar, mover, devolver y cancelar', () => {
  it('coger una ficha del banco y soltarla en un destino la coloca y la quita del banco', () => {
    const result = run(board(), { type: 'pick-bank', degree: 'b3' }, { type: 'drop-slot', slot: 2 })
    expect(result.slots).toEqual([null, null, 'b3', null])
    expect(result.held).toBeNull()
    expect(bankRemaining(result.slots)).toEqual(['1', '3', '5', 'b5', '7', 'b7'])
  })

  it('una ficha colocada no se puede coger otra vez del banco', () => {
    const placed = run(board(), { type: 'pick-bank', degree: '5' }, { type: 'drop-slot', slot: 0 })
    expect(applyDegreeAction(placed, { type: 'pick-bank', degree: '5' })).toBe(placed)
  })

  it('volver a tocar la ficha sostenida la suelta, y coger otra cambia la que se sostiene', () => {
    const held = run(board(), { type: 'pick-bank', degree: '1' })
    expect(held.held).toEqual({ from: 'bank', degree: '1' })
    expect(applyDegreeAction(held, { type: 'pick-bank', degree: '1' }).held).toBeNull()
    expect(applyDegreeAction(held, { type: 'pick-bank', degree: '7' }).held).toEqual({ from: 'bank', degree: '7' })
  })

  it('soltar sobre un destino ocupado sustituye la ficha, que vuelve al banco', () => {
    const result = run(board(['1', null, null, null]), { type: 'pick-bank', degree: 'b7' }, { type: 'drop-slot', slot: 0 })
    expect(result.slots).toEqual(['b7', null, null, null])
    expect(bankRemaining(result.slots)).toContain('1')
  })

  it('mover una ficha colocada a un destino vacío la traslada', () => {
    const result = run(board(['3', null, null, null]), { type: 'pick-slot', slot: 0 }, { type: 'drop-slot', slot: 3 })
    expect(result.slots).toEqual([null, null, null, '3'])
    expect(result.held).toBeNull()
  })

  it('mover una ficha a un destino ocupado intercambia ambas', () => {
    const result = run(board(['3', '5', null, null]), { type: 'pick-slot', slot: 0 }, { type: 'drop-slot', slot: 1 })
    expect(result.slots).toEqual(['5', '3', null, null])
  })

  it('devolver al banco quita la ficha del destino', () => {
    const result = run(board([null, 'b5', null, null]), { type: 'pick-slot', slot: 1 }, { type: 'drop-bank' })
    expect(result.slots).toEqual(newSlots())
    expect(bankRemaining(result.slots)).toContain('b5')
  })

  it('soltar una ficha del banco en el banco no cambia nada y quita la selección', () => {
    const result = run(board(), { type: 'pick-bank', degree: '3' }, { type: 'drop-bank' })
    expect(result).toEqual(board())
  })

  it('cancelar deja los destinos como estaban', () => {
    const before = board(['1', '3', null, null])
    const holding = run(before, { type: 'pick-slot', slot: 1 })
    expect(holding.held).toEqual({ from: 'slot', slot: 1 })
    const after = applyDegreeAction(holding, { type: 'cancel' })
    expect(after.slots).toEqual(before.slots)
    expect(after.held).toBeNull()
    expect(applyDegreeAction(board(), { type: 'cancel' })).toEqual(board())
  })

  it('soltar la ficha de un destino en el mismo destino la cancela', () => {
    const result = run(board([null, 'b3', null, null]), { type: 'pick-slot', slot: 1 }, { type: 'drop-slot', slot: 1 })
    expect(result).toEqual(board([null, 'b3', null, null]))
  })

  it('quitar con teclado vacía el destino y suelta la ficha si era la sostenida', () => {
    const holding = run(board(['7', null, null, null]), { type: 'pick-slot', slot: 0 })
    const cleared = applyDegreeAction(holding, { type: 'clear-slot', slot: 0 })
    expect(cleared).toEqual(board())
    expect(applyDegreeAction(board(), { type: 'clear-slot', slot: 0 }).slots).toEqual(newSlots())
  })

  it('ignora destinos inexistentes y coger un destino vacío', () => {
    const start = board(['1', null, null, null])
    expect(applyDegreeAction(start, { type: 'pick-slot', slot: 1 })).toBe(start)
    expect(applyDegreeAction(start, { type: 'pick-slot', slot: 9 })).toBe(start)
    const holding = run(start, { type: 'pick-slot', slot: 0 })
    expect(applyDegreeAction(holding, { type: 'drop-slot', slot: -1 })).toBe(holding)
    expect(applyDegreeAction(start, { type: 'drop-slot', slot: 1 })).toBe(start)
  })

  it('no modifica el tablero de entrada', () => {
    const start = board(['1', '3', null, null])
    const snapshot = JSON.stringify(start)
    run(start, { type: 'pick-slot', slot: 0 }, { type: 'drop-slot', slot: 1 }, { type: 'drop-bank' })
    expect(JSON.stringify(start)).toBe(snapshot)
  })
})

describe('invariantes con secuencias aleatorias de acciones', () => {
  it('nunca hay un grado duplicado, destinos fuera de rango ni fichas perdidas del banco', () => {
    const rng = createRng(2026)
    const pick = <T,>(items: readonly T[]) => items[Math.floor(rng() * items.length)]!
    for (let trial = 0; trial < 200; trial += 1) {
      let current = board()
      for (let step = 0; step < 60; step += 1) {
        const action = pick<DegreeAction>([
          { type: 'pick-bank', degree: pick(DEGREE_BANK) },
          { type: 'pick-slot', slot: Math.floor(rng() * 6) - 1 },
          { type: 'drop-slot', slot: Math.floor(rng() * 6) - 1 },
          { type: 'drop-bank' },
          { type: 'cancel' },
          { type: 'clear-slot', slot: Math.floor(rng() * 6) - 1 },
        ])
        current = applyDegreeAction(current, action)
        const placed = current.slots.filter((degree): degree is Degree => degree !== null)
        expect(new Set(placed).size).toBe(placed.length)
        expect(current.slots).toHaveLength(SLOT_COUNT)
        expect(placed.length + bankRemaining(current.slots).length).toBe(DEGREE_BANK.length)
        if (current.held?.from === 'slot') expect(current.slots[current.held.slot]).not.toBeNull()
        if (current.held?.from === 'bank') expect(placed).not.toContain(current.held.degree)
      }
    }
  })
})
