import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { FIRST, SETS, begin, cardName, truth } from './support'
import type { Voicing } from './support'

const SPOKEN: Record<string, string> = { '1': '1', '3': '3', b3: 'bemol 3', '5': '5', b5: 'bemol 5', '6': '6', '7': '7', b7: 'bemol 7' }
const BANK = ['1', '3', 'b3', '5', 'b5', '6', '7', 'b7']

const ficha = (page: Page, degree: string) => page.locator(`.ficha[aria-label^="Grado ${SPOKEN[degree]}"]`)
const destino = (page: Page, slot: number) => page.locator(`[data-destino="${slot}"]`)
const status = (page: Page) => page.locator('.tablero-estado')
const degreesOf = (voicing: Voicing) => voicing.notes.map((note) => note.degree!)
const spareDegree = (voicing: Voicing) => BANK.find((degree) => !degreesOf(voicing).includes(degree))!

async function startHard(page: Page, target = FIRST) {
  await begin(page, target, 'Difícil')
  return truth(page, target.id)
}

async function centre(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Arrastra con el ratón en pasos, como lo haría una persona. */
async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const start = await centre(from)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 12, start.y + 12, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

async function placeAllByTaps(page: Page, voicing: Voicing) {
  for (const [slot, degree] of degreesOf(voicing).entries()) {
    await ficha(page, degree).click()
    await destino(page, slot).click()
  }
}

async function answerSelects(page: Page, voicing: Voicing) {
  await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption(voicing.quality)
  await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption(String(voicing.inversion))
}

test('difícil: banco fijo con b3, b5 y b7 reales, cuatro destinos y tarjeta neutra', async ({ page }) => {
  const answer = await startHard(page)
  await expect(page.locator('.ficha')).toHaveCount(8)
  const names = await page.locator('.ficha').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))
  expect(names).toEqual(BANK.map((degree) => `Grado ${SPOKEN[degree]}`))
  // El banco no se reduce a la solución: sobran grados.
  expect(BANK.length).toBeGreaterThan(answer.notes.length)
  await expect(page.locator('[data-destino]')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Verificar' })).toBeDisabled()
  await expect(page.locator('.juego-tarjeta .card-name, .juego-tarjeta .card-dot-label')).toHaveCount(0)
  for (let slot = 0; slot < 4; slot += 1) {
    await expect(destino(page, slot)).toHaveAttribute('aria-label', new RegExp(`^Círculo ${slot + 1}: cuerda \\d, traste \\d+, vacío$`))
  }
  // Mismo banco en la pregunta siguiente.
  await answerSelects(page, answer)
  await placeAllByTaps(page, answer)
  await page.getByRole('button', { name: 'Verificar' }).click()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  const second = await page.locator('.ficha').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')))
  expect(second).toEqual(names)
})

test('dos toques: ficha y destino colocan los cuatro grados, y Verificar exige todo', async ({ page }) => {
  const answer = await startHard(page)
  const verify = page.getByRole('button', { name: 'Verificar' })
  const degrees = degreesOf(answer)

  await ficha(page, degrees[0]!).click()
  await expect(ficha(page, degrees[0]!)).toHaveAttribute('aria-pressed', 'true')
  await expect(status(page)).toContainText('en la mano')
  await destino(page, 0).click()
  await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))
  await expect(ficha(page, degrees[0]!)).toBeDisabled()
  await expect(ficha(page, degrees[0]!)).toHaveAttribute('aria-label', /colocado$/)

  for (const [slot, degree] of degrees.entries()) {
    if (slot === 0) continue
    await expect(verify).toBeDisabled()
    await ficha(page, degree).click()
    await destino(page, slot).click()
  }
  // Los cuatro destinos están llenos pero faltan acorde e inversión.
  await expect(verify).toBeDisabled()
  await page.getByRole('combobox', { name: 'Acorde', exact: true }).selectOption(answer.quality)
  await expect(verify).toBeDisabled()
  await page.getByRole('combobox', { name: 'Inversión', exact: true }).selectOption(String(answer.inversion))
  await expect(verify).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Acierto|Incorrecto/ })).toHaveCount(0)

  await verify.click()
  await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
  await expect(page.locator('.resumen')).toHaveText('6 de 6 campos correctos.')
  await expect(page.locator('.correccion li.ok')).toHaveCount(6)
  // El tablero desaparece, la solución recupera nombre, grados y colores.
  await expect(page.locator('[data-destino]')).toHaveCount(0)
  await expect(page.locator('.juego-tarjeta .card-name')).toHaveText(cardName(answer))
  await expect(page.locator('.juego-tarjeta .card-dot:not(.card-reference-dot) ~ .card-dot-label')).toHaveCount(4)
  await expect(page.locator('.juego-tarjeta .card-reference-dot')).toHaveCount(answer.notes.some((note) => note.degree === '6') ? 1 : 0)
})

test('aciertos parciales: solo falla el círculo equivocado y el resto se conserva', async ({ page }) => {
  const answer = await startHard(page)
  const degrees = degreesOf(answer)
  const spare = spareDegree(answer)
  await answerSelects(page, answer)
  for (const [slot, degree] of degrees.entries()) {
    await ficha(page, slot === 2 ? spare : degree).click()
    await destino(page, slot).click()
  }
  await page.getByRole('button', { name: 'Verificar' }).click()

  await expect(page.getByRole('heading', { name: 'Acierto parcial' })).toBeVisible()
  await expect(page.locator('.resumen')).toHaveText('5 de 6 campos correctos.')
  await expect(page.locator('.correccion li.ko')).toHaveCount(1)
  const note = answer.notes[2]!
  await expect(page.locator('.correccion li.ko')).toContainText(`Círculo 3 (cuerda ${note.string}, traste ${note.fret}): incorrecto.`)
  await expect(page.locator('.correccion li.ko')).toContainText('Solución:')
  await expect(page.locator('.correccion li.ok')).toHaveCount(5)
  await expect(page.getByRole('combobox', { name: 'Acorde', exact: true })).toBeDisabled()
})

test('arrastre con el ratón: del banco a un círculo y entre círculos', async ({ page }) => {
  const answer = await startHard(page)
  const degrees = degreesOf(answer)

  for (const [slot, degree] of degrees.entries()) {
    await drag(page, ficha(page, degree), await centre(destino(page, slot)))
    await expect(destino(page, slot)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degree]}$`))
    await expect(ficha(page, degree)).toBeDisabled()
  }
  await expect(page.locator('.ficha-fantasma')).toHaveCount(0)

  // Arrastrar un grado colocado a otro círculo intercambia ambos.
  await drag(page, destino(page, 0), await centre(destino(page, 1)))
  await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[1]!]}$`))
  await expect(destino(page, 1)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))

  // Arrastrarlo de vuelta al banco lo devuelve.
  await drag(page, destino(page, 0), await centre(page.locator('.banco h3')))
  await expect(destino(page, 0)).toHaveAttribute('aria-label', /vacío$/)
  await expect(ficha(page, degrees[1]!)).toBeEnabled()
})

test('arrastre soltado fuera y pointercancel cancelan sin cambiar nada', async ({ page }) => {
  const answer = await startHard(page)
  const degree = degreesOf(answer)[0]!
  const token = ficha(page, degree)

  // Soltar fuera de cualquier destino.
  await drag(page, token, { x: 4, y: 4 })
  await expect(token).toBeEnabled()
  await expect(token).toHaveAttribute('aria-pressed', 'false')
  for (let slot = 0; slot < 4; slot += 1) await expect(destino(page, slot)).toHaveAttribute('aria-label', /vacío$/)

  // pointercancel durante el arrastre.
  const start = await centre(token)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 20, start.y + 20, { steps: 3 })
  await expect(page.locator('.ficha-fantasma')).toHaveCount(1)
  await token.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true })
  await expect(page.locator('.ficha-fantasma')).toHaveCount(0)
  await expect(token).toHaveAttribute('aria-pressed', 'false')
  await page.mouse.up()
  for (let slot = 0; slot < 4; slot += 1) await expect(destino(page, slot)).toHaveAttribute('aria-label', /vacío$/)
  await expect(token).toBeEnabled()
})

test('arrastre con el dedo: eventos táctiles reales llevan la ficha a un círculo', async ({ page, context }) => {
  const answer = await startHard(page)
  const degree = degreesOf(answer)[0]!
  if (test.info().project.name !== 'movil') {
    // Escritorio: sin pantalla táctil, el mismo gesto con el ratón.
    await drag(page, ficha(page, degree), await centre(destino(page, 0)))
  } else {
    const cdp = await context.newCDPSession(page)
    const from = await centre(ficha(page, degree))
    const to = await centre(destino(page, 0))
    const point = (x: number, y: number) => [{ x, y, id: 1 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) })
    for (let step = 1; step <= 10; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: point(from.x + ((to.x - from.x) * step) / 10, from.y + ((to.y - from.y) * step) / 10),
      })
    }
    await expect(page.locator('.ficha-fantasma')).toHaveCount(1)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degree]}$`))
  await expect(ficha(page, degree)).toBeDisabled()
  await expect(page.locator('.ficha-fantasma')).toHaveCount(0)
  // El gesto no desplaza la página.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('cambio, devolución y cancelación con toques antes de verificar', async ({ page }) => {
  const answer = await startHard(page)
  const [first, second, third] = degreesOf(answer) as [string, string, string]

  // Colocar en el círculo 1 y cambiarlo de sitio al 2 (vacío).
  await ficha(page, first).click()
  await destino(page, 0).click()
  await destino(page, 0).click()
  await expect(destino(page, 0)).toHaveAttribute('aria-pressed', 'true')
  await destino(page, 1).click()
  await expect(destino(page, 0)).toHaveAttribute('aria-label', /vacío$/)
  await expect(destino(page, 1)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[first]}$`))

  // Sustituir: otra ficha sobre un círculo ocupado devuelve la anterior al banco.
  await ficha(page, second).click()
  await destino(page, 1).click()
  await expect(destino(page, 1)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[second]}$`))
  await expect(ficha(page, first)).toBeEnabled()

  // Intercambiar dos círculos ocupados.
  await ficha(page, third).click()
  await destino(page, 2).click()
  await destino(page, 1).click()
  await destino(page, 2).click()
  await expect(destino(page, 1)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[third]}$`))
  await expect(destino(page, 2)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[second]}$`))

  // Devolver al banco con el botón.
  await expect(page.getByRole('button', { name: 'Devolver al banco' })).toBeDisabled()
  await destino(page, 2).click()
  await expect(page.getByRole('button', { name: 'Devolver al banco' })).toBeEnabled()
  await page.getByRole('button', { name: 'Devolver al banco' }).click()
  await expect(destino(page, 2)).toHaveAttribute('aria-label', /vacío$/)
  await expect(ficha(page, second)).toBeEnabled()

  // Cancelar: volver a tocar la misma ficha, o Escape, no cambia nada.
  await ficha(page, second).click()
  await expect(ficha(page, second)).toHaveAttribute('aria-pressed', 'true')
  await ficha(page, second).click()
  await expect(ficha(page, second)).toHaveAttribute('aria-pressed', 'false')
  await ficha(page, second).click()
  await page.keyboard.press('Escape')
  await expect(ficha(page, second)).toHaveAttribute('aria-pressed', 'false')
  await expect(destino(page, 1)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[third]}$`))
})

test('teclado: coger con Intro o Espacio, soltar en un círculo, Escape cancela y Supr quita', async ({ page }) => {
  const answer = await startHard(page)
  const [first, second] = degreesOf(answer) as [string, string]

  await ficha(page, first).focus()
  await page.keyboard.press('Enter')
  await expect(ficha(page, first)).toHaveAttribute('aria-pressed', 'true')
  await destino(page, 0).focus()
  await page.keyboard.press('Space')
  await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[first]}$`))

  await ficha(page, second).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('Escape')
  await expect(ficha(page, second)).toHaveAttribute('aria-pressed', 'false')

  await destino(page, 0).focus()
  await page.keyboard.press('Enter')
  await expect(destino(page, 0)).toHaveAttribute('aria-pressed', 'true')
  await destino(page, 3).focus()
  await page.keyboard.press('Enter')
  await expect(destino(page, 3)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[first]}$`))
  await expect(destino(page, 0)).toHaveAttribute('aria-label', /vacío$/)

  await destino(page, 3).focus()
  await page.keyboard.press('Delete')
  await expect(destino(page, 3)).toHaveAttribute('aria-label', /vacío$/)
  await expect(ficha(page, first)).toBeEnabled()
})

test('b3, b5 y b7 reales: contestar 3, 5 o 7 en su lugar falla en cada círculo con alteración', async ({ page }) => {
  // Se busca una pregunta con alteraciones; las calidades m7, 7 y m7b5 las tienen casi siempre.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const answer = await startHard(page, FIRST)
    const degrees = degreesOf(answer)
    const flats = degrees.filter((degree) => degree.startsWith('b'))
    if (flats.length > 0) {
      await answerSelects(page, answer)
      for (const [slot, degree] of degrees.entries()) {
        await ficha(page, degree.replace(/^b/, '')).click()
        await destino(page, slot).click()
      }
      await page.getByRole('button', { name: 'Verificar' }).click()
      await expect(page.locator('.correccion li.ko')).toHaveCount(flats.length)
      await expect(page.locator('.correccion li.ko').first()).toContainText('Solución: ♭')
      return
    }
    await page.getByRole('button', { name: 'Salir' }).click()
  }
  throw new Error('no apareció ninguna forma con alteraciones en ocho intentos')
})

test('difícil en los siete sets: cuatro destinos y banco completo con la tarjeta neutra', async ({ page }) => {
  for (const target of SETS) {
    const answer = await startHard(page, target)
    await expect(page.locator('[data-destino]'), target.id).toHaveCount(answer.notes.length)
    await expect(page.locator('.ficha'), target.id).toHaveCount(8)
    const html = await page.locator('.juego-tarjeta').innerHTML()
    expect(html).not.toContain(answer.id)
    expect(html).not.toMatch(/data-(quality|voicing|id|inversion|degree)/)
    await page.getByRole('button', { name: 'Salir' }).click()
  }
})

for (const width of [360, 390, 430]) {
  test(`móvil ${width} px, difícil: sin desplazamiento, fichas de 48 px y destinos mayores que el círculo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const answer = await startHard(page)
    const measure = () =>
      page.evaluate(() => {
        const rect = (el: Element) => el.getBoundingClientRect()
        const card = rect(document.querySelector('.tablero svg')!)
        const dots = [...document.querySelectorAll('.tablero svg .card-dot')].map(rect)
        const targets = [...document.querySelectorAll('[data-destino]')].map(rect)
        const overlap = targets.some((a, i) =>
          targets.some((b, j) => j > i && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5),
        )
        return {
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
          cardLeft: card.left,
          cardRight: card.right,
          tokens: [...document.querySelectorAll('.ficha, main select, .devolver, .boton-principal')].map((el) => [rect(el).width, rect(el).height]),
          cells: targets.map((box, i) => ({ w: box.width, h: box.height, dotW: dots[i]!.width, dotH: dots[i]!.height })),
          overlap,
        }
      })
    const metrics = await measure()
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client)
    expect(metrics.cardLeft).toBeGreaterThanOrEqual(0)
    expect(metrics.cardRight).toBeLessThanOrEqual(metrics.client)
    for (const [w, h] of metrics.tokens) {
      expect(w).toBeGreaterThanOrEqual(47.5)
      expect(h).toBeGreaterThanOrEqual(47.5)
    }
    expect(metrics.cells).toHaveLength(4)
    for (const cell of metrics.cells) {
      expect(cell.w).toBeGreaterThan(cell.dotW)
      expect(cell.h).toBeGreaterThan(cell.dotH)
      expect(cell.h).toBeGreaterThanOrEqual(24)
    }
    expect(metrics.overlap, 'las áreas de los destinos no se solapan').toBe(false)

    // Toque real en el proyecto móvil, clic en escritorio: el flujo es el mismo.
    const touch = test.info().project.name === 'movil'
    for (const [slot, degree] of degreesOf(answer).entries()) {
      if (touch) {
        await ficha(page, degree).tap()
        await destino(page, slot).tap()
      } else {
        await ficha(page, degree).click()
        await destino(page, slot).click()
      }
    }
    await answerSelects(page, answer)
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
    const finalScroll = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(finalScroll[0]).toBeLessThanOrEqual(finalScroll[1]!)
  })
}

const compact = (page: Page, slot: number) => page.locator(`[data-colocar="${slot}"]`)

test('la ficha del arrastre táctil va por encima del dedo y el destino se detecta con el dedo', async ({ page, context }) => {
  const answer = await startHard(page)
  const degree = degreesOf(answer)[0]!
  const touch = test.info().project.name === 'movil'
  const from = await centre(ficha(page, degree))
  const target = await centre(destino(page, 0))
  if (!touch) {
    // Con ratón la ficha sigue al puntero sin desplazarse.
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 6 })
    const centreOfGhost = async () => {
      const box = (await page.locator('.ficha-fantasma').boundingBox())!
      return [box.x + box.width / 2, box.y + box.height / 2]
    }
    await expect.poll(async () => Math.abs((await centreOfGhost())[0]! - target.x)).toBeLessThanOrEqual(2)
    await expect.poll(async () => Math.abs((await centreOfGhost())[1]! - target.y)).toBeLessThanOrEqual(2)
    await page.mouse.up()
  } else {
    const cdp = await context.newCDPSession(page)
    const point = (x: number, y: number) => [{ x, y, id: 1 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) })
    for (let step = 1; step <= 10; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: point(from.x + ((target.x - from.x) * step) / 10, from.y + ((target.y - from.y) * step) / 10),
      })
    }
    // Se espera a que la ficha pinte el último movimiento del dedo antes de medirla.
    const ghostBox = async () => (await page.locator('.ficha-fantasma').boundingBox())!
    await expect.poll(async () => Math.abs((await ghostBox()).x + (await ghostBox()).width / 2 - target.x)).toBeLessThanOrEqual(2)
    const ghost = await ghostBox()
    // El dedo está sobre el destino: la ficha dibujada queda claramente por encima y no lo cubre.
    expect(ghost.y + ghost.height, 'la ficha no cubre el punto del dedo').toBeLessThan(target.y)
    expect(target.y - (ghost.y + ghost.height / 2)).toBeGreaterThanOrEqual(40)
    expect(ghost.y).toBeGreaterThanOrEqual(0)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  // El destino se calculó con el dedo, no con la ficha dibujada: queda en el círculo 1.
  await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degree]}$`))
  for (const slot of [1, 2, 3]) await expect(destino(page, slot)).toHaveAttribute('aria-label', /vacío$/)
})

for (const width of [360, 390, 430]) {
  test(`«Colocar sin arrastrar» a ${width} px: cuatro botones de 48 px que colocan, mueven e intercambian`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const answer = await startHard(page)
    const degrees = degreesOf(answer)

    // Identificados por cuerda y traste, de 48×48 como mínimo, y sin pista antes de colocar nada.
    await expect(page.locator('[data-colocar]')).toHaveCount(4)
    for (const [slot, note] of answer.notes.entries()) {
      await expect(compact(page, slot)).toHaveAttribute('aria-label', `Colocar en cuerda ${note.string}, traste ${note.fret}: vacío`)
      const box = (await compact(page, slot).boundingBox())!
      expect(box.width, `ancho del botón ${slot + 1}`).toBeGreaterThanOrEqual(48)
      expect(box.height, `alto del botón ${slot + 1}`).toBeGreaterThanOrEqual(48)
    }
    const section = await page.locator('.colocar').innerText()
    expect(section).not.toMatch(/maj7|m7|inversi|Fundamental/i)
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    expect(fits).toBe(true)

    // Colocar: ficha y botón compacto. El tablero y el botón reflejan lo mismo.
    await ficha(page, degrees[0]!).click()
    await compact(page, 0).click()
    await expect(compact(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))
    await expect(destino(page, 0)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))
    await expect(ficha(page, degrees[0]!)).toBeDisabled()

    // Mover a un círculo vacío.
    await compact(page, 0).click()
    await expect(compact(page, 0)).toHaveAttribute('aria-pressed', 'true')
    await expect(destino(page, 0)).toHaveAttribute('aria-pressed', 'true')
    await compact(page, 2).click()
    await expect(compact(page, 0)).toHaveAttribute('aria-label', /vacío$/)
    await expect(destino(page, 2)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))

    // Intercambiar dos ocupados, mezclando botón compacto y círculo del tablero.
    await ficha(page, degrees[1]!).click()
    await compact(page, 3).click()
    await compact(page, 2).click()
    await destino(page, 3).click()
    await expect(compact(page, 2)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[1]!]}$`))
    await expect(compact(page, 3)).toHaveAttribute('aria-label', new RegExp(`grado ${SPOKEN[degrees[0]!]}$`))

    // Cancelar con Escape y completar la respuesta solo con los botones compactos.
    await compact(page, 2).click()
    await page.keyboard.press('Escape')
    await expect(compact(page, 2)).toHaveAttribute('aria-pressed', 'false')
    for (const slot of [2, 3]) {
      await compact(page, slot).click()
      await page.getByRole('button', { name: 'Devolver al banco' }).click()
    }
    for (const [slot, degree] of degrees.entries()) {
      await ficha(page, degree).click()
      await compact(page, slot).click()
    }
    await answerSelects(page, answer)
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByRole('heading', { name: 'Acierto completo' })).toBeVisible()
    await expect(page.locator('.colocar')).toHaveCount(0)
  })
}
