import { configDefaults } from 'vitest/config'
import { describe, expect, it } from 'vitest'
import { exclude } from './vitest.config'

describe('configuración de Vitest', () => {
  it('conserva las exclusiones predeterminadas', () => {
    for (const pattern of configDefaults.exclude) {
      expect(exclude).toContain(pattern)
    }
  })

  it('excluye E2E, tests de la base con node:test y worktrees', () => {
    expect(exclude).toEqual(
      expect.arrayContaining(['e2e/**', 'tests/**', '.claude/worktrees/**']),
    )
  })
})
