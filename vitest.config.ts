import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Se amplían los valores por defecto, no se sustituyen. tests/ conserva los
// tests de la base con node:test, e2e/ pertenece a Playwright y los worktrees
// de Claude Code contienen copias del proyecto.
export const exclude = [...configDefaults.exclude, 'e2e/**', 'tests/**', '.claude/worktrees/**']

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      exclude,
    },
  }),
)
