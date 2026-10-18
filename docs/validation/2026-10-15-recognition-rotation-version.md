# Rotación de reconocimiento y versión visible

Versión de la entrega: 1.0.0, fijada desde el anterior 0.0.0 del paquete. Rama: `fix/recognition-rotation-version`. El usuario aprobó y autorizó la publicación el 15/10/2026, con commit, fusión, etiqueta y despliegue tras el cierre técnico.

## Comportamiento

El selector anterior solo excluía la tarjeta inmediatamente anterior. Con azar constante alternaba dos posiciones incluso habiendo dieciséis disponibles. No mantenía un historial de las tarjetas que ya habían salido.

Cada ronda de reconocimiento sortea con el mismo peso entre las tarjetas pendientes y descarta las mostradas. Se agota el set antes de repetir. Al empezar otra ronda evita repetir la última tarjeta de la anterior si hay alternativas. Con una sola tarjeta la repetición se admite. Se aplica a Fácil, Medio y Difícil; las rutas no cambian. La lista vive solo en la partida: Salir y empezar o recargar inicia otra ronda. El formato de progreso y sus contadores no cambian.

La versión se muestra arriba a la derecha en una etiqueta pequeña, también en juegos, correcciones y estudio. Se importa de `package.json`; no se recupera el bloque informativo eliminado.

## Archivos de la entrega

- `src/session/recognition.ts`, `src/session/index.ts`: historial de ronda y selección entre pendientes; el evaluador recibe únicamente los campos que necesita.
- `src/ui/App.tsx`, `src/ui/app.css`: etiqueta de versión compartida por las pantallas.
- `package.json`, `package-lock.json`: 1.0.0; sin cambios de dependencias.
- `src/session/recognition.test.ts`, `src/session/index.test.ts`, `src/ui/App.test.tsx`, `e2e/recognition-rotation.spec.ts`: regresiones de rotación y versión.
- README, requisitos y plan de pruebas: comportamiento actualizado.
- DTS Markdown, plantilla, LaTeX, PDF y registro de hashes: actualización parcial de sesión, versión y portada/pies; se conservan los apartados históricos ajenos a esta revisión. Manuales sin cambios y sincronizados.
- `AGENTS.md`: preferencia expresa del usuario por Claude Code cuando esté disponible.
- Este registro de validación.

La relación describe el diff completo de la entrega. La iteración de cierre añade la preferencia por Claude en `AGENTS.md` y actualiza este registro; conserva los cambios de aplicación ya revisados. Los datos musicales, sus fuentes, los scripts del service worker y el almacenamiento permanecen sin cambios.

## Regresiones antes del cambio

Se seleccionaron las pruebas nuevas con `cada ronda|once formas|tarjetas descartadas|etiqueta pequeña` en `recognition.test.ts`, `index.test.ts` y `App.test.tsx`: 24 fallaron con la implementación anterior. Cubren siete sets por tres dificultades, un catálogo de once formas, la conservación de descartes al verificar/Siguiente y la etiqueta de versión.

Las cuatro ejecuciones de `recognition-rotation.spec.ts` (dos escenarios en escritorio y móvil) también fallaron sobre el build anterior: la tercera tarjeta ya repetía una de las dos primeras y no existía la versión en pantalla. Hubo que adaptar la configuración local de Playwright al navegador disponible y a la carpeta de trabajo; los fallos iniciales de esa adaptación no se cuentan como regresiones del producto.

## Comprobaciones de la implementación

| Comprobación | Selección y resultado |
| --- | --- |
| Vitest dirigido | `recognition.test.ts`, `index.test.ts`, `hard.test.ts`, `counting.test.ts`, `store.test.ts`, `App.test.tsx`: 105 pruebas correctas en seis archivos. Cubre generador, transición de sesión, consumidores de Difícil, conteo, guardado e interfaz. |
| Build | `npm run build`: tipos de aplicación/herramientas y Vite correctos. |
| ESLint | Archivos TypeScript/TSX modificados, incluidos los tests y el E2E nuevo: correcto. |
| E2E de reconocimiento e interfaz | `recognition-rotation.spec.ts`, `recognition.spec.ts`, `smoke.spec.ts`: 44 correctos en escritorio y móvil. Los cuatro casos nuevos prueban dos rondas completas y la versión en menú, reconocimiento, corrección, rutas y estudio. |
| E2E de Difícil | `degrees.spec.ts`, filtro `banco fijo|dos toques:|difícil en los siete sets`: seis casos correctos en escritorio y móvil. |
| Documento técnico | Generado con `scripts/build_dts.py --engine lualatex`: 16 páginas, sin `Overfull hbox`, revisadas visualmente. |
| Documentación | `npm run docs:check`: enlaces e integridad de DTS y manuales correctos. |
| Revisión manual | Build servido por Vite preview: 360 y 1280 px, etiqueta `v1.0.0`, sin errores de ejecución ni desplazamiento horizontal. Capturas del menú y de la pregunta. Preview detenido al terminar. |

Los listados de Playwright confirmaron las selecciones de 44 y seis ejecuciones antes de probar. La selección unitaria nueva contiene parametrización dinámica: el listado agrupa esa declaración y la ejecución confirma los 24 casos de regresión esperados.

## Cierre autorizado

La conexión `Claude local2` se comprobó de nuevo a petición del usuario y devolvió un error interno. No hay CLI Claude instalada en este entorno. Claude no desarrolló ni revisó esta entrega; Codex completa el cierre. La preferencia por Claude queda registrada para los siguientes trabajos.

| Comprobación final | Resultado |
| --- | --- |
| `npm run lint` | Correcto |
| Pruebas de la base (`npm test`, paso `test:base`) | 87 correctas, sin omitidas |
| `npm run test:unit -- --reporter=verbose` | 319 correctas en 24 archivos, sin omitidas |
| `npm run build` | Tipos y Vite correctos |
| E2E completos de Playwright | 186 correctos en 12 archivos y dos proyectos, sin omitidos; 2,2 minutos |
| `npm run data:check` | Catálogo y rutas coinciden con las fuentes |
| `npm run audit:music` | 124 posiciones, 112 evaluables, doce de referencia y 16 rutas correctas |
| `npm run docs:check:final` | DTS, manuales, enlaces y hashes sincronizados |

`npm test` completó con código cero y dejó el resumen de 87 casos de la base, pero su salida no recogió el resumen de Vitest. Se ejecutó el paso unitario explícitamente con reporter detallado para confirmar los 319 casos; no se atribuye un recuento a una salida vacía. Los E2E completos utilizan una configuración local externa al repositorio que conserva ambos proyectos y el build previo, cambiando solo la ruta del Chromium disponible y limitando a dos workers.

No cambió el código de aplicación entre esta batería y el candidato a publicar. Las pruebas de navegador usan Chromium en escritorio y emulación móvil; no sustituyen una comprobación en un teléfono físico. No hay preview permanente activo.
