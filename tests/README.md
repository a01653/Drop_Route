# Tests con node:test

Ejecutar `npm run test:base`.

- `music-catalog.test.mjs`: 24 tests de la base musical. Usan notas físicas y oráculos de rutas independientes, no solo comparación de tablas consigo mismas.
- `tooling.test.mjs`: 11 tests del utillaje. Cubren el lanzador de Python con un sistema simulado y que el workflow de GitHub y la configuración de Playwright conservan sus pasos.
- `documentation-policy.test.mjs`: 9 tests que conservan los controles documentales durante el aplazamiento de LaTeX/PDF: fuentes pendientes en desarrollo, cierre estricto, política required e integridad de los derivados existentes. Debe seguir incluido en los tests de la base.

DR-001 conserva estos tests con node:test, sin migrarlos a Vitest, y Vitest los excluye. `npm test` ejecuta primero estos 44 y después los tests de `src/`, de modo que ninguno queda fuera.
