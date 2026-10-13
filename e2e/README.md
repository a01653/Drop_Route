# E2E

Playwright prueba el build servido por vite preview, no el servidor de desarrollo. `npm run test:e2e` genera el build, lo sirve en 127.0.0.1:4173 durante la prueba y lo detiene al terminar. Requiere Chromium: `npx playwright install chromium`.

No reutiliza servidores: si el puerto 4173 está ocupado, Playwright falla antes de ejecutar ningún test. El proceso principal fija `DROP_ROUTE_E2E_STARTED_AT` al empezar y el humo exige que `dist/index.html` sea posterior y que el preview sirva ese mismo fichero.

Hay dos proyectos, `escritorio` (Desktop Chrome) y `movil` (Pixel 7, emulado en Chromium). `smoke.spec.ts` es el humo de DR-001: arranque, datos empaquetados, build generado en la ejecución y servido por el preview, consola limpia y 360 px sin desplazamiento horizontal. No hay todavía escenarios de juego; cada funcionalidad añadirá los suyos. Consultar docs/TEST_PLAN.md.
