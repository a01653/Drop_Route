# Plan de pruebas

## Actual

51 pruebas con node:test (`npm run test:base`). Las 24 de la base musical validan 124 posiciones y 16 rutas, integridad SHA-256 y extracción reproducible. Las 11 de `tests/tooling.test.mjs` cubren el lanzador de Python (versiones, orden de candidatos, error claro cuando falta) y que el workflow y Playwright conservan sus pasos. Las 9 de `tests/documentation-policy.test.mjs` cubren la política documental y las 7 de `tests/icon.test.mjs`, el icono: hashes, tamaños reales de los PNG y legibilidad a 32 px medida sobre sus píxeles.

172 tests Vitest (`npm run test:unit`) en trece ficheros: las capas de datos, música y sesión (menú, preguntas, corrección por campos, banco y acciones de grados, reductor), la configuración, las pantallas de menú, pregunta y revisión, y las tarjetas (geometría de las 112 formas, vista neutra sin pistas y vista de solución). `npm test` ejecuta primero node:test y después Vitest.

129 pruebas E2E (`npm run test:e2e`) sobre el build servido por vite preview: cinco escenarios de humo, ocho de tarjetas, dieciséis de reconocimiento fácil y medio, diecisiete de difícil y quince de rutas, en un proyecto de escritorio y otro móvil, más la comparación con la plantilla original, que se ejecuta una vez. Las de tarjetas miden el DOM a 360, 390 y 430 px en los siete sets y en neutra y solución.

Lint (`npm run lint`) y comprobación de tipos (`npm run typecheck`, incluida en `npm run build`). Hay pruebas de los juegos de reconocimiento y de rutas; no hay todavía pruebas de persistencia. No crear tests omitidos que simulen cobertura.

La política documental tiene regresiones con fixtures temporales en `tests/documentation-policy.test.mjs`: fuentes pendientes admitidas durante desarrollo, rechazo en modo final/required, cierre con hashes sincronizados, derivados ausentes o alterados y política/manifiesto inválidos. Aplazar la generación no desactiva estos controles.

## Matriz

Cubiertas en DR-003 y DR-004: preguntas, respuesta, corrección, grados, móvil de los juegos de reconocimiento y pistas en las opciones de respuesta. Cubiertas en DR-005: rutas (cuatro candidatas de la misma calidad, solución exacta, partida estable y transición desde el V correcto) y su móvil a 360, 390 y 430 px. Siguen pendientes persistencia y PWA.

| Área | Comportamiento a probar |
| --- | --- |
| Preguntas | Opciones únicas, una correcta, azar reproducible, no repetir inmediatamente si hay alternativas. |
| Respuesta | Fácil no exige inversión; medio sí; difícil exige cuatro destinos. Incompleto no verifica. |
| Corrección | Por campos; una sola puntuación por primer intento; respuesta bloqueada tras verificar. |
| Rutas | Cuatro candidatas de misma calidad, solución exacta, partida estable, transición desde V correcto, retroceso/avance con estado conservado y resumen final de aciertos, alternativas y pendientes, con comparación desplegable de los dos diagramas. |
| Grados | Alteraciones, dos toques, arrastre, devolución, sustitución, teclado y pointercancel. |
| Móvil | Anchos 360/390/430 px, controles táctiles, una candidata visible y sin recortes. Tarjetas y pantalla de revisión cubiertas en DR-002; juegos y rutas pendientes. |
| Pistas | Fondo y círculos neutros; sin solución en títulos, tooltips o nombres accesibles. Cubierto para las tarjetas en DR-002; falta comprobarlo en las opciones de respuesta de los juegos. |
| Persistencia | Almacenamiento bloqueado o dañado, recarga y migración de esquema. |
| PWA | Recarga offline tras primera carga e instalación técnica real. |

## E2E

Selección por familia y set, fácil correcto/incorrecto, medio con inversión fallida, difícil incompleto y completo por dos toques/arrastre, rutas II-V y V-I, Tu respuesta/Solución, anterior/siguiente con respuestas restauradas, finalizar/revisar el test, abrir y comparar los dos diagramas, ver alternativas y pendientes, Salir y teclado.

Usar fixtures o semilla solo en entorno de prueba. No depender del azar de producción. Probar sobre build actual.

## Flujo

Pruebas dirigidas durante ajustes y batería completa al cierre. DR-001 añadió Vitest, lint, build y Playwright, conservando los tests musicales y sus oráculos con node:test. Vitest amplía configDefaults.exclude con e2e, tests y los worktrees, sin eliminar los valores predeterminados; un test de configuración lo comprueba.

Los E2E generan el build antes de servirlo y no reutilizan un servidor existente: con el puerto ocupado fallan sin probar nada. Un test del humo comprueba que dist/index.html es posterior al inicio de la ejecución y que el preview devuelve ese mismo fichero. Para añadir un escenario móvil basta ampliar el humo o añadir un spec: el proyecto móvil ya existe.

La batería final aplicable: `npm run validate`, `npm run lint`, `npm run build` y `npm run test:e2e`. El workflow de GitHub ejecuta los mismos pasos por separado (`data:check`, `audit:music`, `test:base`, `docs:check`, `typecheck`, `lint`, `test:unit`, `build` y `test:e2e`) y se ejecuta en GitHub Actions al publicar la rama; no se había ejecutado al preparar el commit de DR-001.

Registrar resultados reales en docs/validation. Los resultados de Mástil no son resultados de Drop Route.

En DR-001 a DR-006 ejecutar docs:check junto con las pruebas aplicables, sin generar LaTeX/PDF o manuales completos. En DR-007 ejecutar docs:build, revisar las páginas y ejecutar docs:check:final; la CI de cierre debe exigir la sincronización completa.
