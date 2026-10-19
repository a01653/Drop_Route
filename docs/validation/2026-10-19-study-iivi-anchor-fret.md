# Validación DR-012: traste ancla en estudio II–V–I

Fecha: 2026-10-19  
Rama: `feat/study-iivi-anchor-fret`

## Comprobaciones

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- Pruebas unitarias enfocadas de transposición, geometría y tarjeta: 42 correctas.
- `npm run validate`: correcto; 87 pruebas base y 348 pruebas unitarias, auditoría musical y comprobación documental.
- `npm run build`: correcto.
- `npm run docs:check:final`: correcto; DTS, manuales y derivados sincronizados.
- `git diff --check`: correcto.

## Prueba de navegador

Se intentó ejecutar la prueba Playwright de la ruta de estudio tras generar el build. No pudo iniciarse porque este entorno no tiene instalado Chromium (`chromium_headless_shell-1248`). La prueba E2E queda pendiente de CI o de un entorno con Chromium.

## Resultado

El modo estudio deriva el ancla de la raíz del acorde II, la muestra en las tres tarjetas y la desplaza con la transposición. Las pruebas confirman los anclajes de las 16 rutas de origen, ambos modos y ambos sets, además de que la fuente `data/routes.json` permanece intacta y la vista neutra no muestra el ancla.
