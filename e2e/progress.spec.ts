import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  DAMAGED_COPY_KEY,
  STORAGE_KEY,
  answerRecognition,
  answerRoute,
  configureRecognition,
  configureRoutes,
  controlStorage,
  expectProgress,
  leave,
  nextQuestion,
  setWriteFailures,
  startQuestion,
  storageNotice,
  stored,
  storedCounters,
} from './play'
import type { Expected, StorageControl } from './play'
import { FIRST, SETS } from './support'

// El progreso se prueba por la interfaz: se juega, se sale, se recarga y se comparan los contadores guardados
// con los que muestra el menú. El oráculo es lo que se ve más data/catalog.json y data/routes.json. Con el
// service worker bloqueado, estas pruebas dependen solo del almacenamiento (el modo sin conexión está en
// offline.spec.ts).
test.use({ serviceWorkers: 'block' })

const [D2S1, D2S2] = [SETS[0]!, SETS[1]!]
const pressed = (page: Page, name: string | RegExp) =>
  expect(page.getByRole('button', { name, exact: typeof name === 'string' })).toHaveAttribute('aria-pressed', 'true')

/** Errores de JavaScript no capturados de la página: el almacenamiento roto no debe romper la aplicación. */
function pageErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test('reconocimiento: cada set y dificultad cuenta aparte, el parcial y el error no suman acierto y todo sobrevive a salir y recargar', async ({ page }) => {
  await page.goto('/')
  await expectProgress(page, {})

  // Fácil en Drop 2+4 set 1: un acierto y un error, cada pregunta se cuenta una sola vez.
  await configureRecognition(page, FIRST, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await nextQuestion(page, 2)
  await answerRecognition(page, FIRST, 'Fácil', 'acorde-incorrecto')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 2] })

  // Medio: acorde correcto con la inversión equivocada es parcial; intenta, pero no acierta.
  await configureRecognition(page, FIRST, 'Medio')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Medio', 'inversion-incorrecta')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 2], 'recognition:D24S1:medium': [0, 1] })

  // Difícil exige acorde, inversión y los cuatro grados: fallar solo un círculo, o solo el acorde, no es acierto.
  await configureRecognition(page, FIRST, 'Difícil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Difícil', 'grado-incorrecto')
  await nextQuestion(page, 2)
  await answerRecognition(page, FIRST, 'Difícil', 'acorde-incorrecto')
  await nextQuestion(page, 3)
  await answerRecognition(page, FIRST, 'Difícil', 'completo')
  await leave(page)
  await expectProgress(page, {
    'recognition:D24S1:easy': [1, 2],
    'recognition:D24S1:medium': [0, 1],
    'recognition:D24S1:hard': [1, 3],
  })

  // Otro set, la misma dificultad: contador propio.
  await configureRecognition(page, D2S1, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, D2S1, 'Fácil', 'completo')
  await leave(page)
  const expected: Expected = {
    'recognition:D24S1:easy': [1, 2],
    'recognition:D24S1:medium': [0, 1],
    'recognition:D24S1:hard': [1, 3],
    'recognition:D2S1:easy': [1, 1],
  }
  await expectProgress(page, expected)

  // Recargar conserva contadores y configuración, y lo que se ve del set elegido es solo su contador.
  await page.reload()
  await expectProgress(page, expected)
  await pressed(page, 'Reconocer voicings')
  await pressed(page, 'Drop 2')
  await pressed(page, /^Set 1\b/)
  await pressed(page, 'Fácil')
  const chosen = page.locator('.progreso h3 + .progreso-lista li')
  await expect(chosen).toHaveCount(1)
  await expect(chosen).toContainText('Drop 2 · set 1 · Fácil')
  await expect(chosen).toContainText('1 de 1 (100 %)')

  // Una pregunta abierta y sin verificar no cuenta ni se reanuda al recargar.
  await startQuestion(page)
  await page.getByRole('button', { name: 'Cm7', exact: true }).click()
  await page.reload()
  await expectProgress(page, expected)
})

test('rutas: set, modo y tramo cuentan aparte, II → V → I cuenta cada tramo una vez y ver la corrección no cuenta', async ({ page }) => {
  await page.goto('/')
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'II → V → I' })
  await startQuestion(page)
  // Una pregunta abierta y sin verificar no cuenta ni se reanuda al recargar.
  await page.reload()
  await expectProgress(page, {})
  await pressed(page, 'Rutas II-V-I')
  await pressed(page, /^Mayor\b/)
  await pressed(page, /^II → V → I\b/)

  // Pregunta 1 (tramo II → V) acertada; la 2 (V → I) de la misma ruta, fallada; la 3 es otra ruta y su II → V se falla.
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: true })
  await nextQuestion(page, 2, 'Siguiente: V → I')
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'V', correct: false })
  // Cambiar de vista en la corrección es solo mirar: no escribe ni cuenta.
  const saved = await stored(page, STORAGE_KEY)
  await page.getByRole('button', { name: 'Tu respuesta', exact: true }).click()
  await page.getByRole('button', { name: 'Solución', exact: true }).click()
  expect(await stored(page, STORAGE_KEY)).toBe(saved)
  await nextQuestion(page, 3)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: false })
  await leave(page)
  await expectProgress(page, { 'routes:D2S1:major:ii-v': [1, 2], 'routes:D2S1:major:v-i': [0, 1] })

  // Solo V → I: suma al contador de su tramo, no al del II → V.
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'V → I' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'V', correct: true })
  await leave(page)
  await expectProgress(page, { 'routes:D2S1:major:ii-v': [1, 2], 'routes:D2S1:major:v-i': [1, 2] })

  // Modo menor del mismo set, y mismo modo en otro set: contadores propios.
  await configureRoutes(page, { set: D2S1, mode: 'Menor', stretch: 'II → V' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'minor', from: 'II', correct: false })
  await leave(page)
  await configureRoutes(page, { set: D2S2, mode: 'Mayor', stretch: 'II → V' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S2', mode: 'major', from: 'II', correct: true })

  // Recargar con la corrección abierta vuelve al menú sin contar otra vez.
  await page.reload()
  const expected: Expected = {
    'routes:D2S1:major:ii-v': [1, 2],
    'routes:D2S1:major:v-i': [1, 2],
    'routes:D2S1:minor:ii-v': [0, 1],
    'routes:D2S2:major:ii-v': [1, 1],
  }
  await expectProgress(page, expected)
  await pressed(page, /^Set 2\b/)
  await pressed(page, /^Mayor\b/)
  await pressed(page, /^II → V del II al V$/)
  const chosen = page.locator('.progreso h3 + .progreso-lista li')
  await expect(chosen).toHaveCount(1)
  await expect(chosen).toContainText('Drop 2 · set 2 · Mayor · II → V')
  await expect(chosen).toContainText('1 de 1 (100 %)')
})

test('los dos juegos suman por separado en el resumen y la configuración elegida muestra los tramos que va a jugar', async ({ page }) => {
  await page.goto('/')
  await configureRecognition(page, D2S1, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, D2S1, 'Fácil', 'completo')
  await leave(page)
  await configureRoutes(page, { set: D2S1, mode: 'Mayor', stretch: 'II → V → I' })
  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S1', mode: 'major', from: 'II', correct: false })
  await leave(page)
  await expectProgress(page, { 'recognition:D2S1:easy': [1, 1], 'routes:D2S1:major:ii-v': [0, 1] })
  // «II → V → I» enseña los dos tramos, también el que aún no tiene intentos.
  const chosen = page.locator('.progreso h3 + .progreso-lista li')
  await expect(chosen).toHaveCount(2)
  await expect(chosen.nth(0)).toContainText('Drop 2 · set 1 · Mayor · II → V')
  await expect(chosen.nth(0)).toContainText('0 de 1 (0 %)')
  await expect(chosen.nth(1)).toContainText('Drop 2 · set 1 · Mayor · V → I')
  await expect(chosen.nth(1)).toContainText('Sin intentos')
})

// ---------------------------------------------------------------------------------------------------------------
// Almacenamiento dañado, bloqueado, lleno, reparado, de una versión futura y migrado
// ---------------------------------------------------------------------------------------------------------------

const DAMAGED = '{"schemaVersion":1,"config":{"game":"recognition","drop":'

test('dañado: se avisa, se empieza de cero, se conserva una copia del original y se puede jugar y recargar', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: DAMAGED } })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Tu progreso guardado estaba dañado')
  await expect(storageNotice(page)).toContainText('Se ha guardado una copia')
  await expectProgress(page, {}, { persisted: false })
  expect(await stored(page, DAMAGED_COPY_KEY)).toBe(DAMAGED)

  await configureRecognition(page, FIRST, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 1] })
  // El aviso informativo se cierra a mano; la copia sigue intacta aunque ya se haya guardado lo nuevo.
  await expect(storageNotice(page)).toBeVisible()
  await storageNotice(page).getByRole('button', { name: 'Entendido' }).click()
  await expect(storageNotice(page)).toHaveCount(0)
  expect(await stored(page, DAMAGED_COPY_KEY)).toBe(DAMAGED)

  // Tras recargar el documento es válido: sin aviso, con el progreso, y la copia no se toca.
  await page.reload()
  await expect(storageNotice(page)).toHaveCount(0)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 1] })
  expect(await stored(page, DAMAGED_COPY_KEY)).toBe(DAMAGED)
  expect(errors).toEqual([])
})

test('dañado y sin poder guardar la copia: no se sobrescribe el original y esta sesión juega solo en memoria', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: DAMAGED }, failWrites: [DAMAGED_COPY_KEY] })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Tu progreso guardado está dañado')
  await expect(storageNotice(page)).toContainText('en esta sesión no se guardará nada')
  await expect(storageNotice(page).getByRole('button')).toHaveCount(0)

  await configureRecognition(page, FIRST, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 1] }, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(DAMAGED)
  expect(await stored(page, DAMAGED_COPY_KEY)).toBeNull()

  // Al recargar sigue igual: nada se perdió ni se pisó, y lo jugado en memoria no se recupera.
  await page.reload()
  await expect(storageNotice(page)).toContainText('Tu progreso guardado está dañado')
  await expectProgress(page, {}, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(DAMAGED)
  expect(errors).toEqual([])
})

test('almacenamiento bloqueado: se avisa, se juega con normalidad en memoria y al recargar no queda nada', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { blocked: true })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Este navegador no deja guardar datos')
  await expectProgress(page, {}, { persisted: false })

  await configureRecognition(page, FIRST, 'Medio')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Medio', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:medium': [1, 1] }, { persisted: false })
  await expect(storageNotice(page)).toContainText('Este navegador no deja guardar datos')

  await page.reload()
  await expect(storageNotice(page)).toContainText('Este navegador no deja guardar datos')
  await expectProgress(page, {}, { persisted: false })
  expect(errors).toEqual([])
})

test('almacenamiento lleno: se avisa de que no se guarda, el juego sigue y al recuperar espacio se guarda todo lo jugado', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { failWrites: '*' })
  await page.goto('/')
  await expectProgress(page, {}, { persisted: false })

  await configureRecognition(page, FIRST, 'Fácil')
  await expect(storageNotice(page)).toContainText('No se ha podido guardar tu progreso')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 1] }, { persisted: false })
  await expect(storageNotice(page)).toContainText('No se ha podido guardar tu progreso')
  expect(await stored(page, STORAGE_KEY)).toBeNull()

  // Vuelve el espacio: con lo siguiente que se juega se guarda el documento completo, también lo anterior.
  await setWriteFailures(page, [])
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  await expect(storageNotice(page)).toHaveCount(0)
  await expectProgress(page, { 'recognition:D24S1:easy': [2, 2] })

  await page.reload()
  await expect(storageNotice(page)).toHaveCount(0)
  await expectProgress(page, { 'recognition:D24S1:easy': [2, 2] })
  expect(errors).toEqual([])
})

// Un contador con más aciertos que intentos y otro de un set que no existe no son válidos; los otros sí.
const REPAIRED = JSON.stringify({
  schemaVersion: 2,
  config: {
    game: 'recognition', drop: 'drop2+4', setId: 'D24S1', difficulty: 'hard', routeMode: 'major', stretch: 'ii-v',
    scaleId: 'major', scaleKey: 0,
  },
  progress: {
    'recognition:D2S1:easy': { attempts: 10, correct: 7 },
    'recognition:D24S1:hard': { attempts: 2, correct: 5 },
    'recognition:XX:easy': { attempts: 1, correct: 1 },
    'routes:D2S1:major:ii-v': { attempts: 3, correct: 3 },
    'routes:D2S2:minor:v-i': { attempts: 6, correct: 4 },
  },
})
const REPAIRED_KEPT: Expected = {
  'recognition:D2S1:easy': [7, 10],
  'routes:D2S1:major:ii-v': [3, 3],
  'routes:D2S2:minor:v-i': [4, 6],
}

test('reparado: se descarta solo lo inválido, se conserva el resto y una copia del original, y jugar suma a lo conservado', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: REPAIRED } })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Parte de tu progreso guardado no era válida')
  await expect(storageNotice(page)).toContainText('Se ha guardado una copia del original')
  await expectProgress(page, REPAIRED_KEPT)
  expect(await stored(page, DAMAGED_COPY_KEY)).toBe(REPAIRED)
  // La configuración válida se respeta.
  await pressed(page, 'Drop 2+4')
  await pressed(page, 'Difícil')

  await configureRecognition(page, D2S1, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, D2S1, 'Fácil', 'completo')
  await leave(page)
  const played: Expected = { ...REPAIRED_KEPT, 'recognition:D2S1:easy': [8, 11] }
  await expectProgress(page, played)
  await storageNotice(page).getByRole('button', { name: 'Entendido' }).click()
  await expect(storageNotice(page)).toHaveCount(0)

  await page.reload()
  await expect(storageNotice(page)).toHaveCount(0)
  await expectProgress(page, played)
  expect(await stored(page, DAMAGED_COPY_KEY)).toBe(REPAIRED)
  expect(errors).toEqual([])
})

const FUTURE = JSON.stringify({ schemaVersion: 99, config: { game: 'routes' }, progress: { 'clave-futura': [1, 2, 3] }, extra: 'de una versión más nueva' })

test('versión futura: se conserva sin tocar, esta sesión no guarda nada y se puede jugar en memoria', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: FUTURE } })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Tu progreso es de una versión más reciente')
  await expect(storageNotice(page)).toContainText('no se guardará nada')
  await expect(storageNotice(page).getByRole('button')).toHaveCount(0)
  await expectProgress(page, {}, { persisted: false })

  await configureRecognition(page, FIRST, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, FIRST, 'Fácil', 'completo')
  await leave(page)
  await expectProgress(page, { 'recognition:D24S1:easy': [1, 1] }, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(FUTURE)

  await page.reload()
  await expect(storageNotice(page)).toContainText('Tu progreso es de una versión más reciente')
  await expectProgress(page, {}, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(FUTURE)
  // Ni copias ni restos de ninguna clase junto al documento.
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([STORAGE_KEY])
  expect(errors).toEqual([])
})

// El esquema 0 no es un formato publicado: es el documento de prueba de src/progress/fixtures, que obliga a recorrer
// la cadena de migración de verdad. Se lee del mismo fichero que usan las pruebas unitarias.
const SCHEMA_0 = readFileSync(resolve('src/progress/fixtures/schema-0.json'), 'utf8')
const MIGRATED: Expected = {
  'recognition:D2S1:easy': [7, 10],
  'recognition:D24S1:hard': [1, 4],
  'routes:D2S2:minor:ii-v': [3, 5],
  'routes:D2S2:minor:v-i': [2, 2],
}

test('migración del esquema 0: se conserva el progreso y la configuración, queda una copia del original y se sigue sumando', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: SCHEMA_0 } })
  await page.goto('/')
  // Migrar sin pérdida no es motivo de aviso.
  await expect(page.locator('.avisos')).toHaveCount(0)
  await expectProgress(page, MIGRATED)
  expect(await stored(page, 'drop-route:state:v0')).toBe(SCHEMA_0)
  const doc = JSON.parse((await stored(page, STORAGE_KEY))!) as { schemaVersion: number }
  expect(doc.schemaVersion).toBe(2)
  await pressed(page, 'Rutas II-V-I')
  await pressed(page, /^Set 2\b/)
  await pressed(page, /^Menor\b/)
  await pressed(page, /^II → V → I\b/)

  await startQuestion(page)
  await answerRoute(page, { setId: 'D2S2', mode: 'minor', from: 'II', correct: true })
  await leave(page)
  const played: Expected = { ...MIGRATED, 'routes:D2S2:minor:ii-v': [4, 6] }
  await expectProgress(page, played)

  await page.reload()
  await expect(page.locator('.avisos')).toHaveCount(0)
  await expectProgress(page, played)
  expect(await storedCounters(page)).toEqual(played)
  expect(await stored(page, 'drop-route:state:v0')).toBe(SCHEMA_0)
  expect(errors).toEqual([])
})

// Esquema 1: el formato publicado hasta la 1.0.3. La 2 añade la escala y la tonalidad de los juegos de escalas.
const SCHEMA_1 = JSON.stringify({
  schemaVersion: 1,
  config: { game: 'routes', drop: 'drop2', setId: 'D2S2', difficulty: 'medium', routeMode: 'minor', stretch: 'both' },
  progress: { 'recognition:D2S1:easy': { attempts: 10, correct: 7 }, 'routes:D2S2:minor:v-i': { attempts: 2, correct: 2 } },
})

test('migración del esquema 1 al 2: sin aviso, con copia del original y con los juegos de escalas disponibles', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: SCHEMA_1 } })
  await page.goto('/')
  await expect(page.locator('.avisos')).toHaveCount(0)
  await expectProgress(page, { 'recognition:D2S1:easy': [7, 10], 'routes:D2S2:minor:v-i': [2, 2] })
  expect(await stored(page, 'drop-route:state:v1')).toBe(SCHEMA_1)
  const doc = JSON.parse((await stored(page, STORAGE_KEY))!) as { schemaVersion: number; config: Record<string, unknown> }
  expect(doc).toMatchObject({ schemaVersion: 2, config: { game: 'routes', setId: 'D2S2', scaleId: 'major', scaleKey: 0 } })
  await pressed(page, 'Rutas II-V-I')
  await page.getByRole('button', { name: 'Ordenar patrones', exact: true }).click()
  await expect(page.getByLabel('Tonalidad')).toHaveValue('0')
  await page.reload()
  await expect(page.locator('.avisos')).toHaveCount(0)
  await pressed(page, 'Ordenar patrones')
  expect(await stored(page, 'drop-route:state:v1')).toBe(SCHEMA_1)
  expect(errors).toEqual([])
})

test('migración sin poder guardar la copia: el original se queda donde está y esta sesión no escribe', async ({ page }) => {
  const errors = pageErrors(page)
  await controlStorage(page, { items: { [STORAGE_KEY]: SCHEMA_0 }, failWrites: ['drop-route:state:v0'] })
  await page.goto('/')
  await expect(storageNotice(page)).toContainText('Tu progreso es de un formato anterior')
  await expectProgress(page, MIGRATED, { persisted: false })

  await configureRecognition(page, D2S1, 'Fácil')
  await startQuestion(page)
  await answerRecognition(page, D2S1, 'Fácil', 'completo')
  await leave(page)
  await expectProgress(page, { ...MIGRATED, 'recognition:D2S1:easy': [8, 11] }, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(SCHEMA_0)

  await page.reload()
  await expect(storageNotice(page)).toContainText('Tu progreso es de un formato anterior')
  await expectProgress(page, MIGRATED, { persisted: false })
  expect(await stored(page, STORAGE_KEY)).toBe(SCHEMA_0)
  expect(errors).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------------
// Móvil: progreso desplegado y avisos
// ---------------------------------------------------------------------------------------------------------------

// «play»: el documento no trae contadores que mostrar y se juega una pregunta en memoria para que haya progreso.
const NOTICE_CASES: { name: string; control: StorageControl; text: string; play: boolean }[] = [
  { name: 'reparado, con botón Entendido', control: { items: { [STORAGE_KEY]: REPAIRED } }, text: 'Parte de tu progreso guardado no era válida', play: false },
  { name: 'dañado sin copia, el aviso más largo', control: { items: { [STORAGE_KEY]: DAMAGED }, failWrites: [DAMAGED_COPY_KEY] }, text: 'Tu progreso guardado está dañado', play: true },
  { name: 'versión futura', control: { items: { [STORAGE_KEY]: FUTURE } }, text: 'Tu progreso es de una versión más reciente', play: true },
  { name: 'almacenamiento bloqueado', control: { blocked: true }, text: 'Este navegador no deja guardar datos', play: true },
]

for (const width of [360, 390, 430]) {
  test(`móvil ${width} px: avisos y progreso desplegado sin desplazamiento horizontal y con controles de 48 px`, async ({ context }) => {
    for (const { name, control, text, play } of NOTICE_CASES) {
      const page = await context.newPage()
      await page.setViewportSize({ width, height: 780 })
      await controlStorage(page, control)
      await page.goto('/')
      await expect(storageNotice(page), name).toContainText(text)
      if (play) {
        await configureRecognition(page, FIRST, 'Fácil')
        await startQuestion(page)
        await answerRecognition(page, FIRST, 'Fácil', 'completo')
        await leave(page)
      }
      await page.getByText('Ver todo el detalle').click()
      await expect(page.locator('.progreso details .progreso-lista li').first()).toBeVisible()

      const metrics = await page.evaluate(() => {
        const client = document.documentElement.clientWidth
        const label = (el: Element) => `${el.tagName} ${(el.textContent ?? '').trim().slice(0, 40)}`
        return {
          scroll: document.documentElement.scrollWidth,
          client,
          small: [...document.querySelectorAll('button, summary, select')]
            .filter((el) => {
              const box = el.getBoundingClientRect()
              return box.width > 0 && (box.height < 47.5 || box.width < 47.5)
            })
            .map(label),
          outside: [...document.querySelectorAll('.avisos *, .progreso *')]
            .filter((el) => {
              const box = el.getBoundingClientRect()
              return box.width > 0 && (box.left < -0.5 || box.right > client + 0.5)
            })
            .map(label),
        }
      })
      expect(metrics.scroll, `${name}: desplazamiento horizontal`).toBeLessThanOrEqual(metrics.client)
      expect(metrics.outside, `${name}: elementos fuera de la pantalla`).toEqual([])
      expect(metrics.small, `${name}: controles menores de 48 px`).toEqual([])
      await page.close()
    }
  })
}
