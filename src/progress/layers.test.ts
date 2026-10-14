import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Además de ESLint: la capa de progreso no conoce React ni la interfaz, y las capas inferiores no la conocen a ella.
const src = fileURLToPath(new URL('..', import.meta.url))
const filesOf = (dir: string): string[] =>
  readdirSync(join(src, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesOf(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [join(dir, entry.name)] : [],
  )
const importsOf = (file: string) =>
  [...readFileSync(join(src, file), 'utf8').matchAll(/(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]!)

describe('capas', () => {
  it('src/progress no importa React ni la interfaz', () => {
    const files = filesOf('progress')
    expect(files.length).toBeGreaterThan(5)
    for (const file of files) {
      for (const specifier of importsOf(file)) {
        expect(specifier, file).not.toMatch(/^react(-dom)?(\/|$)/)
        expect(specifier, file).not.toMatch(/(^|\/)ui(\/|$)/)
      }
    }
  })

  it('data, music y session no importan progress ni la interfaz', () => {
    for (const layer of ['data', 'music', 'session']) {
      for (const file of filesOf(layer)) {
        for (const specifier of importsOf(file)) {
          expect(specifier, file).not.toMatch(/(^|\/)(progress|ui)(\/|$)/)
        }
      }
    }
  })

  it('solo el adaptador del navegador accede al almacenamiento del navegador', () => {
    for (const file of [...filesOf('progress'), ...filesOf('session')].filter((item) => !item.endsWith('.test.ts'))) {
      expect(readFileSync(join(src, file), 'utf8'), file).not.toMatch(/\b(window|globalThis)\.(local|session)Storage/)
    }
  })
})
