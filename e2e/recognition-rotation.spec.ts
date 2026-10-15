import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { answerRecognition, nextQuestion } from './play'
import { FIRST, begin, catalog } from './support'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

test('fácil: agota el set antes de repetir y reparte todas las formas en dos rondas', async ({ page }) => {
  test.setTimeout(90_000)
  // Reproduce el peor caso del selector anterior, que alternaba solo dos posiciones.
  await page.addInitScript(() => { Math.random = () => 0.125 })
  await begin(page, FIRST, 'Fácil')
  const pool = catalog.voicings.filter((item) => item.quizEnabled && item.setId === FIRST.id)
  let lastId: string | undefined
  for (let round = 0; round < 2; round += 1) {
    const ids: string[] = []
    for (let i = 0; i < pool.length; i += 1) {
      const voicing = await answerRecognition(page, FIRST, 'Fácil', 'completo')
      expect(voicing.id).not.toBe(lastId)
      expect(ids).not.toContain(voicing.id)
      ids.push(voicing.id)
      lastId = voicing.id
      await nextQuestion(page, round * pool.length + i + 2)
    }
    expect(ids.sort()).toEqual(pool.map((item) => item.id).sort())
  }
})

test('la versión permanece visible en menú, juego, corrección y modo estudio', async ({ page }) => {
  const versionLabel = page.getByLabel('Versión de Drop Route', { exact: true })
  await page.goto('/')
  await expect(versionLabel).toHaveText(`v${version}`)
  await expect(versionLabel).toBeInViewport()
  await begin(page, FIRST, 'Fácil')
  await expect(versionLabel).toBeVisible()
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await expect(versionLabel).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await page.getByRole('button', { name: 'Rutas II-V-I', exact: true }).click()
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(versionLabel).toBeVisible()
  await page.getByRole('button', { name: 'Salir', exact: true }).click()
  await page.getByRole('link', { name: 'Modo estudio', exact: true }).click()
  await expect(versionLabel).toHaveText(`v${version}`)
  await expect(versionLabel).toBeVisible()
})
