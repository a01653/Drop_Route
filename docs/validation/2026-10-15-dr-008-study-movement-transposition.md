# DR-008 · Validación de modo estudio, movimiento y transposición

Fecha: 15/10/2026

Rama validada: `feat/study-movement-transposition`

Commit validado: `77f533f809f55970d67ccf308e79a631fcd4db92`

GitHub Actions: ejecución `38695734680` (`Validate foundation`, run 60).

## Resultado

Los dos trabajos terminaron correctamente.

### foundation

- `npm ci --ignore-scripts`: OK.
- `npm run data:check`: OK.
- `npm run audit:music`: OK.
- `npm run test:base`: OK.
- `npm run docs:check`: OK.
- `npm run docs:check:final`: OK.

### app

- `npm ci --ignore-scripts`: OK.
- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npm run test:unit`: OK.
- `npm run build`: OK.
- instalación de Chromium: OK.
- `npm run test:e2e`: OK, incluido `e2e/study.spec.ts`.
- `npm run docs:captures`: OK.
- artefacto de capturas: OK.

## Casos propios de DR-008

- Modo estudio accesible desde el menú sin crear una pregunta evaluable.
- Consulta de voicings por Drop, set, calidad e inversión.
- Consulta de las rutas II-V-I completas en Drop 2, sets 1 y 2.
- Transposición a las 12 tonalidades mediante desplazamiento común de la forma.
- Protección frente a trastes negativos: se usa la misma tonalidad una octava más arriba cuando hace falta.
- Grafía funcional de las raíces de I, ii y V en las tonalidades con sostenidos y bemoles.
- La misma transposición se aplica a II, V e I para conservar exactamente la conducción de voces de la ruta fuente.
- `Ver movimiento` muestra por cuerda el cambio de traste en II → V y V → I y el movimiento absoluto total.
- El modo estudio no modifica los contadores de progreso.
- Comprobación E2E específica a 360 px sin desplazamiento horizontal.

## Límites deliberados

La transposición de DR-008 pertenece al modo estudio. Los juegos evaluables continúan en C. No se han modificado `data/catalog.json` ni `data/routes.json`, ni se generan nuevas rutas o voicings.
