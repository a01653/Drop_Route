import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Dependencias permitidas entre capas: ui -> progress -> session -> music -> data.
// La capa inferior no importa nada de las superiores y solo ui conoce React.
const forbid = (...groups) => ({
  'no-restricted-imports': [
    'error',
    { patterns: groups.map(([group, message]) => ({ group, message })) },
  ],
})
const upward = (layer, names) => [
  names.map((name) => `**/${name}`).concat(names.map((name) => `**/${name}/**`)),
  `${layer} no puede depender de ${names.join(', ')}.`,
]
const noReact = [['react', 'react/*', 'react-dom', 'react-dom/*'], 'React solo se usa en ui.']

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    '.claude/worktrees',
    'references',
    'docs',
    'scripts',
    'tests',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.ts', '*.config.test.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: forbid(upward('data', ['music', 'session', 'progress', 'ui']), noReact),
  },
  {
    files: ['src/music/**/*.{ts,tsx}'],
    rules: forbid(upward('music', ['session', 'progress', 'ui']), noReact),
  },
  {
    files: ['src/session/**/*.{ts,tsx}'],
    rules: forbid(upward('session', ['progress', 'ui']), noReact),
  },
  {
    // Progreso y persistencia: lógica pura con el almacenamiento inyectado. Sin React y sin interfaz.
    files: ['src/progress/**/*.{ts,tsx}'],
    rules: forbid(upward('progress', ['ui']), noReact),
  },
  {
    files: ['eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
