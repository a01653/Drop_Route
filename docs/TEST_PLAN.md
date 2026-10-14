# Plan de pruebas

## Actual

Las cifras exactas de cada fase están en los [registros de validación](validation/); aquí se describe qué cubre cada suite y no se copian totales que se desfasan. `npm test` da el recuento actual de node:test y Vitest.

**node:test** (`npm run test:base`), sin dependencias externas: la base musical (124 posiciones, 16 rutas, integridad SHA-256 y extracción reproducible), el utillaje (`tests/tooling.test.mjs`: lanzador de Python y que el workflow y Playwright conservan sus pasos), la política documental, el icono (`tests/icon.test.mjs`: hashes, tamaños reales, legibilidad a 32 px medida sobre sus píxeles y, desde DR-006, la variante maskable, el PNG de 192 y que `public/icons/` es copia idéntica), el generador del service worker y el build de la PWA (`tests/pwa-build.test.mjs`: base de publicación, qué se precachea, versión por contenido y por plantilla del worker, nombre de caché y `npm run build` real con base `/` y `/Drop_Route/`) y el propio worker (`tests/service-worker.test.mjs`, con un arnés que simula la Cache API y la red: precacheo exacto, instalación fallida sin caché a medias, versión nueva en espera, borrado solo de cachés propias de su ámbito, GET del mismo origen y que no toca el almacenamiento del progreso).

**Vitest** (`npm run test:unit`): las capas de datos, música y sesión (menú, preguntas, corrección por campos, banco y acciones de grados, reductor), la configuración, las pantallas de menú, pregunta, ruta y revisión, las tarjetas y, desde DR-006, el progreso (`src/progress`: esquema, migración desde el fixture 0, reparación, conteo por transición, almacén con almacenamiento simulado y límites de capas), el registro del service worker (`src/ui/pwa`), el adaptador del navegador y el panel y los avisos. `npm test` ejecuta primero node:test y después Vitest.

**E2E** (`npm run test:e2e`), sobre el build servido por vite preview, en un proyecto de escritorio y otro móvil: humo, tarjetas, reconocimiento fácil, medio y difícil, rutas, la comparación con la plantilla original (una vez) y, desde DR-006, `progress.spec.ts` y `offline.spec.ts`. `pwa-update.spec.ts` solo corre en escritorio y levanta su propio servidor con dos builds. Las de tarjetas miden el DOM a 360, 390 y 430 px en los siete sets y en neutra y solución.

Lint (`npm run lint`) y comprobación de tipos (`npm run typecheck`, incluida en `npm run build`). No crear tests omitidos que simulen cobertura.

**Estado de DR-006.** Los resultados de DR-006 solo cuentan cuando figuran en su [registro](validation/2026-10-14-dr-006-progress-and-pwa.md) con evidencia observada. Los E2E nuevos están escritos y su ejecución está pendiente en ese registro; no se da por pasada ninguna comprobación que no conste allí.

La política documental tiene regresiones con fixtures temporales en `tests/documentation-policy.test.mjs`: fuentes pendientes admitidas durante desarrollo, rechazo en modo final/required, cierre con hashes sincronizados, derivados ausentes o alterados y política/manifiesto inválidos. Aplazar la generación no desactiva estos controles.

## Matriz

Cubiertas en DR-003 y DR-004: preguntas, respuesta, corrección, grados, móvil de los juegos de reconocimiento y pistas en las opciones de respuesta. Cubiertas en DR-005: rutas (cuatro candidatas de la misma calidad, solución exacta, partida estable y transición desde el V correcto) y su móvil a 360, 390 y 430 px. Con pruebas escritas en DR-006: persistencia y PWA, a falta de la evidencia de los E2E y de la CI de esa fase (véase su registro).

| Área | Comportamiento a probar |
| --- | --- |
| Preguntas | Opciones únicas, una correcta, azar reproducible, no repetir inmediatamente si hay alternativas. |
| Respuesta | Fácil no exige inversión; medio sí; difícil exige cuatro destinos. Incompleto no verifica. |
| Corrección | Por campos; una sola puntuación por primer intento; respuesta bloqueada tras verificar. |
| Rutas | Cuatro candidatas de misma calidad, solución exacta, partida estable y transición desde V correcto. |
| Grados | Alteraciones, dos toques, arrastre, devolución, sustitución, teclado y pointercancel. |
| Móvil | Anchos 360/390/430 px, controles táctiles, una candidata visible y sin recortes. Cubierto en tarjetas, revisión y los dos juegos; en DR-006 también avisos y panel de progreso. |
| Pistas | Fondo y círculos neutros; sin solución en títulos, tooltips o nombres accesibles. Cubierto en las tarjetas y en las opciones de respuesta de los juegos. |
| Persistencia | Contador por juego, set, dificultad o modo y tramo; cada verificación cuenta una vez y ver la corrección no cuenta; recarga y vuelta al menú. Almacenamiento bloqueado, lleno, dañado, reparado y de versión futura; migración del fixture 0 con copia previa; si la copia falla, no se sobrescribe; documentos futuros intactos. |
| PWA | Precacheo exacto de los recursos propios; versión por contenido y por plantilla; instalación fallida sin caché a medias; versión nueva en espera y activación explícita desde el menú con una sola recarga; solo se borran cachés propias de su ámbito; base `/` y `/Drop_Route/`; recarga y juego sin conexión tras la primera carga; aviso de pérdida si lo no guardado solo está en memoria; actualizar no borra el progreso. |

## E2E

Selección por familia y set, fácil correcto/incorrecto, medio con inversión fallida, difícil incompleto y completo por dos toques/arrastre, rutas II-V y V-I, Tu respuesta/Solución, Siguiente, Salir y teclado.

Usar fixtures o semilla solo en entorno de prueba. No depender del azar de producción. Probar sobre build actual.

## Flujo

Pruebas dirigidas durante ajustes y batería completa al cierre. DR-001 añadió Vitest, lint, build y Playwright, conservando los tests musicales y sus oráculos con node:test. Vitest amplía configDefaults.exclude con e2e, tests y los worktrees, sin eliminar los valores predeterminados; un test de configuración lo comprueba.

Los E2E generan el build antes de servirlo y no reutilizan un servidor existente: con el puerto ocupado fallan sin probar nada. Un test del humo comprueba que dist/index.html es posterior al inicio de la ejecución y que el preview devuelve ese mismo fichero. Para añadir un escenario móvil basta ampliar el humo o añadir un spec: el proyecto móvil ya existe.

## Capturas de los manuales (DR-007)

`npm run docs:captures` es un comando explícito, fuera de build, test, validate e instalación. Con `playwright.captures.config.ts` ejecuta `captures/manual.captures.ts` solo en Chromium: construye la aplicación actual en un directorio temporal, la sirve con vite preview en un puerto libre, juega por la interfaz con el mismo oráculo de los E2E (posiciones visibles más `data/catalog.json` y `data/routes.json`, sin semillas ni soluciones inyectadas) y escribe los PNG y `capturas.json` en el destino elegido: sin variable, `docs/manuals/capturas/` (regeneración local intencional de las entradas versionadas); con `DROP_ROUTE_CAPTURE_OUTPUT`, solo en ese directorio. Cierra siempre el preview y borra el directorio temporal. No sustituye a los E2E ni a las pruebas del código.

La CI lo ejecuta después de `npm run test:e2e` con `DROP_ROUTE_CAPTURE_OUTPUT: test-results/manual-captures` y sube de ahí las imágenes como el artefacto `drop-route-manual-captures`, sin tocar las entradas versionadas. El contrato de nombres y los metadatos están en `docs/manuals/capturas/README.md`. Los tests de la base comprueban el paso de la CI, su destino aislado, la resolución del destino y que ninguna otra orden lo lance. Hasta que se ejecute y se revise el resultado, no hay capturas observadas.

La batería final aplicable: `npm run validate`, `npm run lint`, `npm run build` y `npm run test:e2e`. El workflow de GitHub ejecuta los mismos pasos por separado (`data:check`, `audit:music`, `test:base`, `docs:check`, `typecheck`, `lint`, `test:unit`, `build` y `test:e2e`) y se ejecuta en GitHub Actions al publicar la rama. Con DR-006 todavía no hay una ejecución registrada.

Registrar resultados reales en docs/validation. Los resultados de Mástil no son resultados de Drop Route.

En DR-001 a DR-006 ejecutar docs:check junto con las pruebas aplicables, sin generar LaTeX/PDF o manuales completos. En DR-007 ejecutar docs:build, revisar las páginas y ejecutar docs:check:final; la CI de cierre debe exigir la sincronización completa.
