import { afterEach, describe, expect, it } from 'vitest'
import { browserStorage } from './browserStorage'

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
  else Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('adaptador del almacenamiento del navegador', () => {
  it('devuelve el almacenamiento disponible', () => {
    const fake = { getItem: () => null, setItem: () => undefined }
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
    expect(browserStorage()).toBe(fake)
  })

  it('devuelve null si acceder a localStorage lanza (almacenamiento bloqueado)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Acceso denegado', 'SecurityError')
      },
    })
    expect(browserStorage()).toBeNull()
  })

  it('devuelve null si no hay almacenamiento', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true })
    expect(browserStorage()).toBeNull()
  })
})
