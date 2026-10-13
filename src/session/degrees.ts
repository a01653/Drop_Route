import type { Degree } from '../data/types'

/**
 * Banco fijo de grados de la dificultad difícil. Es el mismo para todas las preguntas y contiene todos los
 * grados de las cuatro calidades evaluables, con sus alteraciones reales: ofrecer solo los cuatro correctos
 * daría una pista. Cada grado aparece una sola vez, así que no hay fichas duplicadas.
 */
export const DEGREE_BANK: readonly Degree[] = ['1', '3', 'b3', '5', 'b5', '7', 'b7']

/** Destinos de una pregunta: una nota por círculo, cuatro en todas las formas evaluables. */
export const SLOT_COUNT = 4

export type Slots = readonly (Degree | null)[]

/** Lo que el usuario sostiene: una ficha del banco o la que está en un destino. */
export type Held = { from: 'bank'; degree: Degree } | { from: 'slot'; slot: number }

export interface DegreeBoard {
  slots: Slots
  held: Held | null
}

/**
 * Acciones sobre el tablero. Arrastre, dos toques y teclado usan las mismas: coger (pick), soltar (drop),
 * cancelar y quitar. Así los tres métodos no pueden dar resultados distintos.
 */
export type DegreeAction =
  | { type: 'pick-bank'; degree: Degree }
  | { type: 'pick-slot'; slot: number }
  | { type: 'drop-slot'; slot: number }
  | { type: 'drop-bank' }
  | { type: 'cancel' }
  | { type: 'clear-slot'; slot: number }

export const newSlots = (): (Degree | null)[] => Array.from({ length: SLOT_COUNT }, () => null)

export const isPlaced = (slots: Slots, degree: Degree): boolean => slots.includes(degree)

/** Fichas que siguen en el banco: las que no están colocadas en ningún destino. */
export const bankRemaining = (slots: Slots): Degree[] => DEGREE_BANK.filter((degree) => !isPlaced(slots, degree))

const withSlot = (slots: Slots, slot: number, value: Degree | null): (Degree | null)[] =>
  slots.map((current, index) => (index === slot ? value : current))

const validSlot = (slots: Slots, slot: number) => Number.isInteger(slot) && slot >= 0 && slot < slots.length

export function applyDegreeAction(board: DegreeBoard, action: DegreeAction): DegreeBoard {
  const { slots, held } = board
  switch (action.type) {
    case 'pick-bank': {
      if (!DEGREE_BANK.includes(action.degree) || isPlaced(slots, action.degree)) return board
      // Volver a tocar la ficha que se sostiene la suelta.
      if (held?.from === 'bank' && held.degree === action.degree) return { slots, held: null }
      return { slots, held: { from: 'bank', degree: action.degree } }
    }
    case 'pick-slot': {
      if (!validSlot(slots, action.slot) || slots[action.slot] === null) return board
      if (held?.from === 'slot' && held.slot === action.slot) return { slots, held: null }
      return { slots, held: { from: 'slot', slot: action.slot } }
    }
    case 'drop-slot': {
      if (!held || !validSlot(slots, action.slot)) return board
      if (held.from === 'bank') {
        // Si el destino estaba ocupado, su ficha vuelve al banco al ser sustituida.
        return { slots: withSlot(slots, action.slot, held.degree), held: null }
      }
      if (held.slot === action.slot) return { slots, held: null }
      // Mover una ficha colocada a otro destino intercambia ambas; si estaba vacío, solo la mueve.
      const moved = slots[held.slot] ?? null
      const there = slots[action.slot] ?? null
      return { slots: withSlot(withSlot(slots, action.slot, moved), held.slot, there), held: null }
    }
    case 'drop-bank': {
      if (!held) return board
      if (held.from === 'bank') return { slots, held: null }
      return { slots: withSlot(slots, held.slot, null), held: null }
    }
    case 'cancel':
      return held ? { slots, held: null } : board
    case 'clear-slot': {
      if (!validSlot(slots, action.slot) || slots[action.slot] === null) return board
      const stillHeld = held?.from === 'slot' && held.slot === action.slot ? null : held
      return { slots: withSlot(slots, action.slot, null), held: stillHeld }
    }
  }
}
