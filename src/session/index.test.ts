import { describe, expect, it } from 'vitest'
import { createSession } from '.'

describe('sesión', () => {
  it('empieza en la fase de arranque', () => {
    expect(createSession()).toEqual({ phase: 'arranque' })
  })
})
