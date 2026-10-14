import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { signature } from './support'
import type { Note } from './support'

// Oráculo independiente: la candidata correcta se deduce de las posiciones que dibuja la partida y de
// data/routes.json, sin semilla de pruebas ni atajos en la aplicación.
interface Step {
  function: string
  name: string
  notes: Note[]
}
interface Route {
  id: string
  setId: string
  mode: string
  steps: Step[]
}
const routes = (JSON.parse(readFileSync(resolve('data/routes.json'), 'utf8')) as { routes: Route[] }).routes

type Mode = 'Mayor' | 'Menor'
type Stretch = 'II → V' | 'V → I' | 'II → V → I'
// Nombres accesibles completos: «II → V» es prefijo de «II → V → I».
const STRETCH_NAMES: Record<Stretch, RegExp> = {
  'II → V': /^II → V del II al V$/,
  'V → I': /^V → I del V al I$/,
  'II → V → I': /^II → V → I los dos tramos seguidos$/,
}
const SETS = [
  { set: 'Set 1', id: 'D2S1' },
  { set: 'Set 2', id: 'D2S2' },
]

async function begin(page: Page, options: { set?: (typeof SETS)[number]; mode?: Mode; stretch?: Stretch } = {}) {
  const { set = SETS[0]!, mode = 'Mayor', stretch = 'II → V' } = options
  await page.goto('/')
  await page.getByRole('button', { name: 'Rutas II-V-I', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^${set.set}\\b`) }).click()
  await page.getByRole('button', { name: new RegExp(`^${mode}\\b`) }).click()
  await page.getByRole('button', { name: STRETCH_NAMES[stretch] }).click()
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Pregunta \d+$/ })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  return { setId: set.id, mode: mode === 'Mayor' ? 'major' : 'minor' }
}

const positionsOf = async (page: Page, selector: string): Promise<Note[]> => {
  const label = (await page.locator(`${selector} svg`).first().getAttribute('aria-label')) ?? ''
  const notes = [...label.matchAll(/cuerda (\d), traste (\d+)/g)].map((match) => ({ string: +match[1]!, fret: +match[2]! }))
  expect(notes, label).toHaveLength(4)
  return notes
}
const selectorButton = (page: Page, index: number) => page.getByRole('button', { name: `Candidata ${index + 1}`, exact: true })
const verifyButton = (page: Page) => page.getByRole('button', { name: 'Verificar' })

/** La ruta de la partida: la que tiene ese paso con esas posiciones, en el set y modo elegidos. */
async function routeOfStart(page: Page, setId: string, mode: string, from: 'II' | 'V') {
  const wanted = signature(await positionsOf(page, '.partida'))
  const index = from === 'II' ? 0 : 1
  const found = routes.filter((route) => route.setId === setId && route.mode === mode && signature(route.steps[index]!.notes) === wanted)
  expect(found, `partida ${wanted}`).toHaveLength(1)
  return found[0]!
}

/** Recorre las cuatro candidatas por el selector y devuelve sus posiciones, de una en una. */
async function browseCandidates(page: Page) {
  const seen: string[] = []
  for (let index = 0; index < 4; index += 1) {
    await selectorButton(page, index).click()
    await expect(selectorButton(page, index)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.candidata svg')).toHaveCount(1)
    seen.push(signature(await positionsOf(page, '.candidata')))
  }
  return seen
}

test('el menú de rutas ofrece solo Drop 2, sus dos sets, modo y tramo, y no la dificultad', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Rutas II-V-I', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Drop 2', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Drop 3', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Drop 2+4', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Set \d/ })).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Mayor/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Menor/ })).toBeVisible()
  for (const stretch of Object.values(STRETCH_NAMES)) await expect(page.getByRole('button', { name: stretch })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fácil', exact: true })).toHaveCount(0)
  // Volver a reconocimiento restaura todas las familias.
  await page.getByRole('button', { name: 'Reconocer voicings', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Drop 3', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fácil', exact: true })).toBeVisible()
})

for (const [mode, name] of [['Mayor', 'Dm7'], ['Menor', 'Dm7(b5)']] as const) {
  test(`II → V ${mode.toLowerCase()}: la partida siempre visible, una candidata cada vez y verificación exacta`, async ({ page }) => {
    const { setId, mode: modeKey } = await begin(page, { mode })
    const route = await routeOfStart(page, setId, modeKey, 'II')
    await expect(page.locator('.partida .card-name')).toHaveText(name)
    await expect(page.locator('.partida svg')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: '¿Qué G7 continúa la ruta?' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Candidata \d$/ })).toHaveCount(4)

    // La partida no cambia al mirar candidatas; cada una se ve sola y es una posición distinta.
    const partida = await page.locator('.partida svg').getAttribute('aria-label')
    const seen = await browseCandidates(page)
    expect(new Set(seen).size).toBe(4)
    expect(await page.locator('.partida svg').getAttribute('aria-label')).toBe(partida)
    await expect(page.getByRole('heading', { name: /Es la de nuestra ruta|No es la de nuestra ruta/ })).toHaveCount(0)

    // Las cuatro son G7 del mismo set; solo una es la de nuestra ruta.
    const expected = signature(route.steps[1]!.notes)
    expect(seen).toContain(expected)
    const right = seen.indexOf(expected)
    await selectorButton(page, right).click()
    await verifyButton(page).click()
    await expect(page.getByRole('heading', { name: 'Es la de nuestra ruta' })).toBeVisible()
    await expect(page.locator('.veredicto.ok')).toContainText('✓')
    await expect(page.locator('.candidata')).toHaveCount(0)
  })
}

test('otra posición válida: no es la de nuestra ruta, pero no se declara incorrecta; Tu respuesta y Solución de una en una', async ({ page }) => {
  const { setId, mode } = await begin(page, { set: SETS[1]! })
  const route = await routeOfStart(page, setId, mode, 'II')
  const seen = await browseCandidates(page)
  const expected = signature(route.steps[1]!.notes)
  const right = seen.indexOf(expected)
  const wrong = (right + 1) % 4
  await selectorButton(page, wrong).click()
  await verifyButton(page).click()

  await expect(page.getByRole('heading', { name: 'No es la de nuestra ruta' })).toBeVisible()
  await expect(page.locator('.veredicto.ko')).toContainText('Es otra posición válida de G7, pero esta ruta usa')
  await expect(page.locator('.veredicto.ko')).toContainText('✗')
  await expect(page.locator('main')).not.toContainText(/incorrect|equivocad|error/i)

  // Dos diagramas como máximo: la partida y uno solo de los dos del comparador.
  await expect(page.locator('main svg')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Solución', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(signature(await positionsOf(page, '.comparacion'))).toBe(expected)
  await page.getByRole('button', { name: 'Tu respuesta', exact: true }).click()
  await expect(page.locator('main svg')).toHaveCount(2)
  expect(signature(await positionsOf(page, '.comparacion'))).toBe(seen[wrong])
  await expect(page.locator('.comparacion .juego-pie')).toContainText(`Tu respuesta: candidata ${wrong + 1}`)
  await page.getByRole('button', { name: 'Solución', exact: true }).click()
  expect(signature(await positionsOf(page, '.comparacion'))).toBe(expected)
})

test('V → I: parte del V de la ruta y las cuatro candidatas son Cmaj7 (mayor) o Cm7 (menor)', async ({ page }) => {
  for (const [mode, name] of [['Mayor', 'Cmaj7'], ['Menor', 'Cm7']] as const) {
    const { setId, mode: modeKey } = await begin(page, { mode, stretch: 'V → I' })
    const route = await routeOfStart(page, setId, modeKey, 'V')
    await expect(page.locator('.partida .card-name')).toHaveText('G7')
    await expect(page.getByRole('heading', { name: `¿Qué ${name} continúa la ruta?` })).toBeVisible()
    const seen = await browseCandidates(page)
    const expected = signature(route.steps[2]!.notes)
    expect(seen).toContain(expected)
    await selectorButton(page, seen.indexOf(expected)).click()
    await verifyButton(page).click()
    await expect(page.getByRole('heading', { name: 'Es la de nuestra ruta' })).toBeVisible()
    await expect(page.locator('.comparacion .card-name')).toHaveText(name)
    await page.getByRole('button', { name: 'Salir' }).click()
  }
})

test('II → V → I: tras fallar el V, el tramo V-I parte del V correcto de la misma ruta y luego cambia de ruta', async ({ page }) => {
  const { setId, mode } = await begin(page, { stretch: 'II → V → I' })
  const route = await routeOfStart(page, setId, mode, 'II')
  const seen = await browseCandidates(page)
  const expectedV = signature(route.steps[1]!.notes)
  const wrong = (seen.indexOf(expectedV) + 1) % 4
  await selectorButton(page, wrong).click()
  await verifyButton(page).click()
  await expect(page.getByRole('heading', { name: 'No es la de nuestra ruta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Siguiente: V → I' })).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente: V → I' }).click()

  // Misma ruta, tramo V-I, y la partida es el V correcto, no el que se eligió.
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué Cmaj7 continúa la ruta?' })).toBeVisible()
  expect(signature(await positionsOf(page, '.partida'))).toBe(expectedV)
  expect(signature(await positionsOf(page, '.partida'))).not.toBe(seen[wrong])
  const seenI = await browseCandidates(page)
  const expectedI = signature(route.steps[2]!.notes)
  await selectorButton(page, seenI.indexOf(expectedI)).click()
  await verifyButton(page).click()
  await expect(page.getByRole('heading', { name: 'Es la de nuestra ruta' })).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 3' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Qué G7 continúa la ruta?' })).toBeVisible()
  const next = await routeOfStart(page, setId, mode, 'II')
  expect(next.id).not.toBe(route.id)
})

test('la candidata es neutra en los dos sets y modos: sin nombre, grados, colores ni identificadores', async ({ page }) => {
  for (const set of SETS) {
    for (const mode of ['Mayor', 'Menor'] as const) {
      for (const stretch of ['II → V', 'V → I'] as const) {
        await begin(page, { set, mode, stretch })
        for (let index = 0; index < 4; index += 1) {
          await selectorButton(page, index).click()
          const html = await page.locator('.candidata-tarjeta').innerHTML()
          const label = `${set.id} ${mode} ${stretch} candidata ${index + 1}`
          expect(html, label).not.toContain('card-name')
          expect(html).not.toContain('card-dot-label')
          expect(html).not.toMatch(/data-|<title|<desc/)
          expect(html.toUpperCase()).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/)
          const dots = await page.locator('.candidata-tarjeta .card-dot').evaluateAll((circles) => circles.map((circle) => getComputedStyle(circle).fill))
          expect(new Set(dots).size, label).toBe(1)
          const aria = await page.locator('.candidata-tarjeta svg').getAttribute('aria-label')
          expect(aria).not.toMatch(/G7|Cmaj7|Cm7|inversi|Fundamental|grado/i)
        }
        await page.getByRole('button', { name: 'Salir' }).click()
      }
    }
  }
})

test('deslizar la tarjeta cambia de candidata y no verifica ni cambia la partida', async ({ page, context }) => {
  await begin(page)
  const card = page.locator('.candidata-tarjeta')
  const partida = await page.locator('.partida svg').getAttribute('aria-label')
  // Fracciones del ancho de la tarjeta; la posición se mide en cada gesto porque la página puede desplazarse.
  const swipe = async (from: number, to: number) => {
    await card.scrollIntoViewIfNeeded()
    const box = (await card.boundingBox())!
    const y = box.y + box.height / 2
    const fromX = box.x + box.width * from
    const toX = box.x + box.width * to
    if (test.info().project.name === 'movil') {
      const cdp = await context.newCDPSession(page)
      const point = (x: number) => [{ x, y, id: 1 }]
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(fromX) })
      for (let step = 1; step <= 6; step += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(fromX + ((toX - fromX) * step) / 6) })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else {
      await page.mouse.move(fromX, y)
      await page.mouse.down()
      await page.mouse.move(toX, y, { steps: 6 })
      await page.mouse.up()
    }
  }
  await expect(selectorButton(page, 0)).toHaveAttribute('aria-pressed', 'true')
  await swipe(0.8, 0.2)
  await expect(selectorButton(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.candidata-tarjeta + .juego-pie')).toContainText('Candidata 2 de 4')
  await swipe(0.8, 0.2)
  await expect(selectorButton(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await swipe(0.2, 0.8)
  await expect(selectorButton(page, 1)).toHaveAttribute('aria-pressed', 'true')
  // Un gesto corto no cambia nada.
  await swipe(0.5, 0.45)
  await expect(selectorButton(page, 1)).toHaveAttribute('aria-pressed', 'true')
  // En los extremos no da la vuelta.
  await selectorButton(page, 0).click()
  await swipe(0.2, 0.8)
  await expect(selectorButton(page, 0)).toHaveAttribute('aria-pressed', 'true')
  await selectorButton(page, 3).click()
  await swipe(0.8, 0.2)
  await expect(selectorButton(page, 3)).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('.partida svg').getAttribute('aria-label')).toBe(partida)
  await expect(page.getByRole('heading', { name: /nuestra ruta/ })).toHaveCount(0)
})

test('teclado: las flechas cambian de candidata, Intro verifica y el foco acompaña al resultado', async ({ page }) => {
  await begin(page)
  await selectorButton(page, 0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(selectorButton(page, 1)).toBeFocused()
  await expect(selectorButton(page, 1)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(selectorButton(page, 3)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(selectorButton(page, 2)).toBeFocused()
  await verifyButton(page).focus()
  await page.keyboard.press('Enter')
  const heading = page.getByRole('heading', { name: /nuestra ruta/ })
  await expect(heading).toBeVisible()
  await expect(heading).toBeFocused()
  // Verificar de nuevo es imposible: ya no hay botón y el selector sigue visible pero bloqueado.
  await expect(page.getByRole('button', { name: 'Verificar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Candidata \d$/ })).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) await expect(selectorButton(page, index)).toBeDisabled()
})

const RED = 'rgb(185, 28, 28)'
const GREEN = 'rgb(22, 101, 52)'

test('tras un fallo el selector sigue visible y bloqueado: elegida en rojo con ✗, la de nuestra ruta en verde con ✓', async ({ page }) => {
  const { setId, mode } = await begin(page, { set: SETS[1]! })
  const route = await routeOfStart(page, setId, mode, 'II')
  const seen = await browseCandidates(page)
  const expected = signature(route.steps[1]!.notes)
  const right = seen.indexOf(expected)
  const wrong = (right + 2) % 4  const others = [0, 1, 2, 3].filter((index) => index !== right && index !== wrong)

  // Antes de verificar: sin marcas, sin descripciones y sin botones bloqueados.
  await selectorButton(page, wrong).click()
  for (let index = 0; index < 4; index += 1) {
    const button = selectorButton(page, index)
    await expect(button).toBeEnabled()
    await expect(button).toHaveText(String(index + 1))
    await expect(button).not.toHaveClass(/\b(ok|ko)\b/)
    await expect(button).toHaveAccessibleDescription('')
  }
  await verifyButton(page).click()
  await expect(page.getByRole('heading', { name: 'No es la de nuestra ruta' })).toBeVisible()

  for (let index = 0; index < 4; index += 1) await expect(selectorButton(page, index)).toBeDisabled()
  await expect(page.locator('.selector button[aria-pressed="true"]')).toHaveCount(1)
  await expect(selectorButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
  await expect(selectorButton(page, wrong)).toHaveClass(/\bko\b/)
  await expect(selectorButton(page, wrong)).toHaveText(`${wrong + 1} ✗`)
  await expect(selectorButton(page, wrong)).toHaveCSS('background-color', RED)
  await expect(selectorButton(page, wrong)).toHaveAccessibleDescription('Tu respuesta, no es la de nuestra ruta')
  await expect(selectorButton(page, right)).toHaveAttribute('aria-pressed', 'false')
  await expect(selectorButton(page, right)).toHaveClass(/\bok\b/)
  await expect(selectorButton(page, right)).toHaveText(`${right + 1} ✓`)
  await expect(selectorButton(page, right)).toHaveCSS('background-color', GREEN)
  await expect(selectorButton(page, right)).toHaveAccessibleDescription('La de nuestra ruta')
  for (const index of others) {
    await expect(selectorButton(page, index)).not.toHaveClass(/\b(ok|ko)\b/)
    await expect(selectorButton(page, index)).toHaveText(String(index + 1))
    await expect(selectorButton(page, index)).toHaveAccessibleDescription('')
  }
  // El rojo es «no coincide con la ruta», no invalidez musical.
  await expect(page.locator('.veredicto.ko')).toContainText('Es otra posición válida de G7')
  await expect(page.locator('main')).not.toContainText(/incorrect|equivocad|error|inválid/i)

  // Ver Tu respuesta o la Solución no cambia la respuesta ni las marcas, y se ve un solo diagrama de comparación.
  await page.getByRole('button', { name: 'Tu respuesta', exact: true }).click()
  await expect(page.locator('main svg')).toHaveCount(2)
  await expect(selectorButton(page, wrong)).toHaveClass(/\bko\b/)
  await expect(selectorButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Solución', exact: true }).click()
  await expect(page.locator('main svg')).toHaveCount(2)
  await expect(selectorButton(page, wrong)).toHaveAttribute('aria-pressed', 'true')
  await expect(selectorButton(page, right)).toHaveClass(/\bok\b/)

  // Las posiciones y colores musicales de los diagramas siguen siendo los de la solución.
  const solution = await page.locator('.comparacion .card-dot').evaluateAll((circles) => circles.map((circle) => getComputedStyle(circle).fill))
  expect(new Set(solution).size).toBeGreaterThan(1)
})

test('acierto: solo la elegida, en verde con ✓, y ninguna roja; Siguiente deja el selector libre y sin marcas', async ({ page }) => {
  const { setId, mode } = await begin(page)
  const route = await routeOfStart(page, setId, mode, 'II')
  const seen = await browseCandidates(page)
  const right = seen.indexOf(signature(route.steps[1]!.notes))
  await selectorButton(page, right).click()
  await verifyButton(page).click()
  await expect(page.getByRole('heading', { name: 'Es la de nuestra ruta' })).toBeVisible()
  await expect(page.locator('.selector button.ok')).toHaveCount(1)
  await expect(page.locator('.selector button.ko')).toHaveCount(0)
  await expect(selectorButton(page, right)).toHaveText(`${right + 1} ✓`)
  await expect(selectorButton(page, right)).toHaveAttribute('aria-pressed', 'true')
  await expect(selectorButton(page, right)).toHaveAccessibleDescription('Tu respuesta, la de nuestra ruta')
  for (let index = 0; index < 4; index += 1) await expect(selectorButton(page, index)).toBeDisabled()

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Pregunta 2' })).toBeVisible()
  await expect(page.locator('.candidata-tarjeta svg')).toHaveCount(1)
  await expect(page.locator('.selector button.ok, .selector button.ko')).toHaveCount(0)
  await expect(page.locator('.selector .solo-lectores')).toHaveCount(0)
  for (let index = 0; index < 4; index += 1) {
    await expect(selectorButton(page, index)).toBeEnabled()
    await expect(selectorButton(page, index)).toHaveText(String(index + 1))
  }
  await expect(page.locator('.selector button[aria-pressed="true"]')).toHaveCount(1)
  await expect(verifyButton(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tu respuesta', exact: true })).toHaveCount(0)
  const html = await page.locator('.candidata-tarjeta').innerHTML()
  expect(html.toUpperCase()).not.toMatch(/#E11D48|#0284C7|#059669|#EDBC07/)
  // Y se puede volver a elegir.
  await selectorButton(page, 3).click()
  await expect(selectorButton(page, 3)).toHaveAttribute('aria-pressed', 'true')
})

for (const width of [360, 390, 430]) {
  for (const stretch of ['II → V', 'V → I'] as const) {
    test(`móvil ${width} px, ${stretch}: sin desplazamiento, tarjetas completas, controles de 48 px y nunca cuatro diagramas`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 })
      await begin(page, { stretch, mode: 'Menor', set: SETS[1]! })
      const check = async (stage: string, diagrams: number) => {
        const metrics = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('main svg.fretboard-card')].map((svg) => svg.getBoundingClientRect())
          const small = [...document.querySelectorAll('main button')]
            .filter((el) => {
              const box = el.getBoundingClientRect()
              return box.width > 0 && (box.height < 47.5 || box.width < 47.5)
            })
            .map((el) => el.textContent)
          return {
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
            cards: cards.map((box) => [box.left, box.right]),
            small,
          }
        })
        expect(metrics.scroll, `${stage}: desplazamiento horizontal`).toBeLessThanOrEqual(metrics.client)
        expect(metrics.cards, `${stage}: diagramas visibles`).toHaveLength(diagrams)
        for (const [left, right] of metrics.cards) {
          expect(left).toBeGreaterThanOrEqual(0)
          expect(right).toBeLessThanOrEqual(metrics.client)
        }
        expect(metrics.small, `${stage}: controles menores de 48 px`).toEqual([])
      }
      await check('pregunta', 2)
      for (let index = 0; index < 4; index += 1) {
        await selectorButton(page, index).click()
        await check(`candidata ${index + 1}`, 2)
      }
      await verifyButton(page).click()
      await expect(page.getByRole('heading', { name: /nuestra ruta/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Candidata \d$/ })).toHaveCount(4)
      await check('corrección', 2)
      await page.getByRole('button', { name: 'Tu respuesta', exact: true }).click()
      await check('tu respuesta', 2)
    })
  }
}
