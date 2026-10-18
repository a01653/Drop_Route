import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { CHORDS, FIRST, MUSICAL_COLORS, SETS, begin, cardName, catalog, choiceName, truth } from './support'

const otherChord = (name: string) => CHORDS.find((chord) => chord !== name)!
const chordSelect = (page: Page) => page.getByRole('combobox', { name: 'Acorde', exact: true })
const inversionSelect = (page: Page) => page.getByRole('combobox', { name: 'Inversión', exact: true })
const chordButton = (page: Page, name: string) => page.getByRole('button', { name: choiceName(name), exact: true })
const inversionName = (inversion: number) => catalog.inversions[inversion]!

test('fácil: cuatro botones, seleccionar no verifica y el acierto bloquea y muestra la solución', async ({ page }) => {
  await begin(page, FIRST, 'Fácil')
  const answer = await truth(page, FIRST.id)

  for (const chord of CHORDS) await expect(chordButton(page, chord)).toBeVisible()
  await expect(page.locator('select')).toHaveCount(0)
  const verify = page.getByRole('button', { name: 'Verificar' })
  await expect(verify).toBeDisabled()
  // Pregunta neutra: ni nombre, ni familia, ni colores musicales en la tarjeta.
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveCount(0)
  const neutralSvg = await page.locator('.juego-tarjeta svg').evaluate((svg) => svg.outerHTML)
  for (const color of MUSICAL_COLORS) expect(neutralSvg.toUpperCase()).not.toContain(color.toUpperCase())

  // Seleccionar no verifica ni puntúa: se puede cambiar de opinión.
  await chordButton(page, otherChord(answer.name)).click()
  await expect(verify).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Acierto|Incorrecto/ })).toHaveCount(0)
  await chordButton(page, answer.name).click()
  await expect(chordButton(page, answer.name)).toHaveAttribute('aria-pressed', 'true')
  await expect(chordButton(page, otherChord(answer.name))).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('heading', { name: /Acierto|Incorrecto/ })).toHaveCount(0)

  await verify.click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await expect(page.locator('.correccion li.ok')).toHaveCount(1)
  await expect(page.locator('.correccion')).toContainText('Acorde: correcto.')
  // Respuesta bloqueada y conservada; solución con su nombre y colores musicales.
  for (const chord of CHORDS) await expect(chordButton(page, chord)).toBeDisabled()
  await expect(chordButton(page, answer.name)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveText(cardName(answer))
  await expect(page.locator('.juego-pie')).toContainText(`Solución: ${cardName(answer)}, ${inversionName(answer.inversion)}`)
  await expect(page.getByRole('button', { name: 'Verificar' })).toHaveCount(0)
})

test('fácil: el error se marca con texto y símbolo, conserva la respuesta y Siguiente abre otra pregunta', async ({ page }) => {
  await begin(page, FIRST, 'Fácil')
  const first = await truth(page, FIRST.id)
  const wrong = otherChord(first.name)
  await chordButton(page, wrong).click()
  await page.getByRole('button', { name: 'Verificar' }).click()

  await expect(page.getByRole('heading', { name: 'Incorrecto' })).toBeVisible()
  await expect(page.locator('.correccion li.ko')).toContainText('Acorde: incorrecto.')
  await expect(page.locator('.correccion li.ko')).toContainText(`Tu respuesta: ${choiceName(wrong)}.`)
  await expect(page.locator('.correccion li.ko')).toContainText(`Solución: ${choiceName(first.name)}.`)
  await expect(page.locator('.correccion li.ko .marca')).toHaveText('✗')
  await expect(chordButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
  await expect(chordButton(page, wrong)).toHaveClass(/ko/)
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveText(cardName(first))

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 2' })).toBeVisible()
  const second = await truth(page, FIRST.id)
  expect(second.id, 'no repite la forma anterior').not.toBe(first.id)
  for (const chord of CHORDS) {
    await expect(chordButton(page, chord)).toBeEnabled()
    await expect(chordButton(page, chord)).toHaveAttribute('aria-pressed', 'false')
  }
  await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveCount(0)
})

test('reconocimiento: anterior restaura el test y Terminar y revisar lista los errores', async ({ page }) => {
  await begin(page, FIRST, 'Fácil')
  const first = await truth(page, FIRST.id)
  const wrong = otherChord(first.name)
  await chordButton(page, wrong).click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()

  const second = await truth(page, FIRST.id)
  await chordButton(page, second.name).click()
  await page.getByRole('button', { name: 'Verificar' }).click()
  await page.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 1' })).toBeVisible()
  await expect(chordButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Incorrecto' })).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await page.getByRole('button', { name: 'Terminar y revisar' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Revisión del test' })).toBeVisible()
  const attempts = page.locator('.lista-revision-ruta > li')
  await expect(attempts).toHaveCount(2)
  await expect(attempts.nth(0)).toContainText('Acorde: tu respuesta:')
  await expect(attempts.nth(0)).toContainText(choiceName(wrong))
  await expect(attempts.nth(0)).toContainText(choiceName(first.name))
  await expect(attempts.nth(1)).toContainText('Acierto completo')
})

test('medio: acorde e inversión por separado, Verificar exige ambos y se corrige por campos', async ({ page }) => {
  await begin(page, FIRST, 'Medio')
  const answer = await truth(page, FIRST.id)
  const verify = page.getByRole('button', { name: 'Verificar' })
  await expect(page.locator('select')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Cmaj7', exact: true })).toHaveCount(0)

  await expect(verify).toBeDisabled()
  await chordSelect(page).selectOption(answer.quality)
  await expect(verify).toBeDisabled()
  const wrongInversion = (answer.inversion + 1) % 4
  await inversionSelect(page).selectOption(String(wrongInversion))
  await expect(verify).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Acierto|Incorrecto/ })).toHaveCount(0)

  await verify.click()
  await expect(page.getByRole('heading', { name: 'Acierto parcial' })).toBeVisible()
  await expect(page.locator('.correccion li.ok')).toContainText('Acorde: correcto.')
  await expect(page.locator('.correccion li.ko')).toContainText('Inversión: incorrecto.')
  await expect(page.locator('.correccion li.ko')).toContainText(`Solución: ${inversionName(answer.inversion)}.`)
  // Bloqueado y conservado.
  await expect(chordSelect(page)).toBeDisabled()
  await expect(inversionSelect(page)).toBeDisabled()
  await expect(chordSelect(page)).toHaveValue(answer.quality)
  await expect(inversionSelect(page)).toHaveValue(String(wrongInversion))
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveText(cardName(answer))
})

test('medio: acierto completo con acorde e inversión correctos', async ({ page }) => {
  await begin(page, SETS[0]!, 'Medio')
  const answer = await truth(page, 'D2S1')
  await inversionSelect(page).selectOption(String(answer.inversion))
  await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
  await chordSelect(page).selectOption(answer.quality)
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await expect(page.locator('.correccion li.ok')).toHaveCount(2)
})

test('Salir vuelve al menú desde la pregunta y desde la corrección, conservando la configuración', async ({ page }) => {
  await begin(page, FIRST, 'Medio')
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Drop 2+4', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^Set 1\b/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Medio', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Empezar' }).click()
  const answer = await truth(page, FIRST.id)
  await chordSelect(page).selectOption(answer.quality)
  await inversionSelect(page).selectOption(String(answer.inversion))
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Drop Route' })).toBeVisible()
})

test('la pregunta es neutra en los siete sets: cuatro círculos grises iguales y solo posiciones', async ({ page }) => {
  for (const target of SETS) {
    await begin(page, target, 'Fácil')
    const answer = await truth(page, target.id)
    const dots = await page.locator('.juego-tarjeta .card-dot').evaluateAll((circles) =>
      circles.map((circle) => ({ fill: getComputedStyle(circle).fill, stroke: getComputedStyle(circle).stroke })),
    )
    expect(dots, target.id).toHaveLength(4)
    expect(new Set(dots.map((dot) => `${dot.fill}|${dot.stroke}`)).size, target.id).toBe(1)
    await expect(page.locator('.juego-tarjeta text.card-dot-label')).toHaveCount(0)
    await expect(page.locator('.juego-tarjeta .card-name, .juego-tarjeta .card-family')).toHaveCount(0)
    // Nada en el DOM de la tarjeta menciona la calidad, la inversión ni la id de la forma.
    const html = await page.locator('.juego-tarjeta').innerHTML()
    expect(html).not.toContain(answer.id)
    expect(html).not.toContain(inversionName(answer.inversion))
    expect(html).not.toMatch(/data-|<title|<desc/)
    const label = await page.locator('.juego-tarjeta svg').getAttribute('aria-label')
    expect(label).not.toMatch(/maj7|m7|Cm|C7|inversi|Fundamental|grado/i)
    await page.getByRole('button', { name: 'Salir' }).click()
  }
})

test('teclado: se elige con Espacio y se verifica con Intro', async ({ page }) => {
  await begin(page, FIRST, 'Fácil')
  const answer = await truth(page, FIRST.id)
  await chordButton(page, answer.name).focus()
  await page.keyboard.press('Space')
  await expect(chordButton(page, answer.name)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Verificar' }).focus()
  await page.keyboard.press('Enter')
  const heading = page.getByRole('heading', { name: 'Acierto completo' })
  await expect(heading).toBeVisible()
  await expect(heading).toBeFocused()
  await page.getByRole('button', { name: 'Siguiente' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 2' })).toBeFocused()
})

for (const width of [360, 390, 430]) {
  for (const difficulty of ['Fácil', 'Medio'] as const) {
    test(`móvil ${width} px, ${difficulty}: sin desplazamiento, tarjeta completa y controles de 48 px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 })
      await begin(page, FIRST, difficulty)
      const check = async (stage: string) => {
        const metrics = await page.evaluate(() => {
          const card = document.querySelector('.juego-tarjeta svg')!.getBoundingClientRect()
          const small = [...document.querySelectorAll('main button, main select')]
            .filter((el) => {
              const box = el.getBoundingClientRect()
              return box.width > 0 && (box.height < 47.5 || box.width < 47.5)
            })
            .map((el) => `${el.tagName} ${el.textContent}`)
          return {
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
            left: card.left,
            right: card.right,
            small,
          }
        })
        expect(metrics.scroll, `${stage}: desplazamiento horizontal`).toBeLessThanOrEqual(metrics.client)
        expect(metrics.left, `${stage}: tarjeta a la izquierda`).toBeGreaterThanOrEqual(0)
        expect(metrics.right, `${stage}: tarjeta a la derecha`).toBeLessThanOrEqual(metrics.client)
        expect(metrics.small, `${stage}: controles menores de 48 px`).toEqual([])
      }
      await check('pregunta')
      const answer = await truth(page, FIRST.id)
      if (difficulty === 'Fácil') {
        await chordButton(page, otherChord(answer.name)).click()
      } else {
        await chordSelect(page).selectOption(answer.quality)
        await inversionSelect(page).selectOption(String((answer.inversion + 2) % 4))
      }
      await page.getByRole('button', { name: 'Verificar' }).click()
      await expect(page.locator('.resultado')).toBeVisible()
      await check('corrección')
    })
  }
}

for (const width of [360, 390, 430]) {
  test(`fácil a ${width} px: tras el error el elegido sale en rojo con ✗, el correcto en verde con ✓ y todo bloqueado`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 })
    await begin(page, FIRST, 'Fácil')
    const answer = await truth(page, FIRST.id)
    const wrong = otherChord(answer.name)

    // Antes de verificar no hay ninguna pista: ni marcas, ni clases, ni descripciones.
    const group = page.locator('.opciones-acorde')
    await expect(group.locator('button.ok, button.ko')).toHaveCount(0)
    await expect(group.locator('[aria-describedby]')).toHaveCount(0)
    await expect(group).not.toContainText(/[✓✗]/)
    await chordButton(page, wrong).click()
    await expect(group.locator('button.ok, button.ko')).toHaveCount(0)
    await expect(group).not.toContainText(/[✓✗]/)

    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByRole('heading', { name: 'Incorrecto' })).toBeVisible()
    await expect(chordButton(page, wrong)).toHaveClass(/ko/)
    await expect(chordButton(page, wrong)).toContainText('✗')
    await expect(chordButton(page, answer.name)).toHaveClass(/ok/)
    await expect(chordButton(page, answer.name)).toContainText('✓')
    // aria-pressed solo en el elegido; los cuatro botones bloqueados; el resto sin marcas.
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1)
    await expect(chordButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
    await expect(chordButton(page, answer.name)).toHaveAttribute('aria-pressed', 'false')
    for (const chord of CHORDS) await expect(chordButton(page, chord)).toBeDisabled()
    await expect(group.locator('button.ok, button.ko')).toHaveCount(2)
    // Colores reales de los dos botones: rojo y verde, no solo clases.
    const colours = await page.evaluate(() =>
      [...document.querySelectorAll('.opciones-acorde button')].map((button) => [button.textContent, getComputedStyle(button).backgroundColor]),
    )
    // El texto del botón es el nombre, más « ✓» o « ✗» si está marcado: coincidencia exacta, porque Cm7 es prefijo de Cm7(b5).
    const colourOf = (name: string) => colours.find(([text]) => text!.replace(/ [✓✗]$/, '') === choiceName(name))![1]
    expect(colourOf(wrong)).toBe('rgb(185, 28, 28)')
    expect(colourOf(answer.name)).toBe('rgb(22, 101, 52)')
    // Descripción accesible, sin cambiar el nombre accesible.
    await expect(chordButton(page, answer.name)).toHaveAccessibleDescription('Respuesta correcta')
    await expect(chordButton(page, wrong)).toHaveAccessibleDescription('Tu respuesta, incorrecta')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    expect(overflow).toBe(true)
  })
}
