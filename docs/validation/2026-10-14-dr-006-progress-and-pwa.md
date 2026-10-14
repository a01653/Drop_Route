# Validación de DR-006: progreso local y PWA

Fecha 14/10/2026. Rama remota del bloque: feat/progress-and-pwa (el conector trabaja en una rama local supervisor/progress-and-pwa, con HEAD en a7fd4d8). Ese HEAD es la base local anterior, no el cierre integrado de DR-005 en main: las fuentes del ajuste se copiaron y coinciden con main 16b6188. Bloque DR-006 + DR-007 autorizado por el usuario; esta fase no regenera LaTeX ni PDF, no prepara manuales y mantiene la política documental en deferred. DR-007 no está preparado.

Este registro separa lo que el supervisor ha ejecutado y visto de lo que está escrito pero no se ha ejecutado. Los resultados son los que ha comunicado el supervisor; Claude no ha podido ejecutar comandos en esta fase.

## Alcance

- Progreso local: contadores de intentos y aciertos, configuración y esquema versionado en `src/progress`, con el único acceso a `localStorage` en `src/ui/browserStorage.ts`.
- Copias del original antes de migrar o reparar; documentos de un esquema futuro intactos; avisos de almacenamiento lleno, bloqueado o dañado.
- PWA: plantilla de service worker y manifest versionados, precaché por versión y por base de publicación, versión nueva en espera con activación explícita, aviso de pérdida de lo no guardado y juego sin conexión.
- Sin cuentas, sincronización, puntuación detallada ni pantalla para recuperar copias. La versión sigue en 0.0.0.

## Qué cubre cada capa

| Tema | Comportamiento comprobado |
| --- | --- |
| Contadores | Se cuenta una pregunta al verificarla, una sola vez. Reconocimiento por set y dificultad; rutas por set, modo y tramo. Ver la corrección, Siguiente y Salir no cuentan. |
| Configuración | Se guarda una única última configuración del menú, que incluye el juego elegido; no hay una configuración independiente por juego. Se recupera al abrir y la página siempre vuelve al menú. |
| Esquema | Documento único `drop-route:state` con `schemaVersion` 1, independiente de la versión del paquete. |
| Fixture del esquema 0 | Solo de test: ejercita la cadena de migración. No es un formato público anterior. |
| Copias | `drop-route:state:damaged` antes de reparar datos ilegibles y `drop-route:state:v<n>` con el original antes de migrar. Si la copia falla, no se reescribe nada y se juega en memoria con aviso. |
| Esquema futuro | Se conserva sin tocar; la sesión no escribe y se avisa. |
| Fallo de cuota | Se avisa, se sigue en memoria y se reintenta con el siguiente cambio. |
| Service worker | La caché se llama `drop-route-precache:<ámbito>:<versión>`; la base de publicación entra en el nombre. La versión es un hash de los recursos y de la plantilla. |
| Actualización | La versión nueva queda esperando; solo el menú la ofrece; la persona la activa y la página se recarga una vez. Con datos solo en memoria, el aviso ofrece «Actualizar y perder lo no guardado». |
| Sin conexión | Pendiente del navegador real: ver «No ejecutado». |

## Comprobaciones ejecutadas

Según el supervisor.

| Comprobación | Resultado |
| --- | --- |
| Vitest de progreso, PWA y avisos | 112 tests correctos en 7 ficheros. |
| Vitest de los consumidores App y browserStorage | 9 tests correctos en 2 ficheros. |
| node:test de PWA (generador y service worker) | 25 correctos. |
| node:test de iconos | 13 correctos. |
| Tipos, lint y build en Linux | Pasaron, antes de escribir los E2E nuevos. |
| Tipos y lint en Windows | Pasaron, antes de escribir los E2E nuevos. |
| Typecheck, lint, docs:check y build en Linux, tras las correcciones de los E2E | Pasaron en la revisión Linux. docs:check acepta el DTS pendiente de regenerar porque la política está en deferred. |
| Typecheck en Windows, tras las correcciones de los E2E | Pasó. |
| Helper `buildPair`, en Linux, para las bases `/` y `/Drop_Route/` | Ejecutado: dos builds por base, 12 recursos cada uno, con identificadores de versión A y B distintos. |

### Controles negativos

Realizados por el supervisor, con restauración posterior byte a byte de los ficheros:

- Ignorar el identificador de la plantilla al calcular la versión: falla 1 test.
- Quitar la ruta de la caché del nombre: fallan 2 tests.

Ambos cambios se revirtieron y los ficheros quedaron idénticos a los originales.

## Iconos de la PWA

Los PNG de la PWA los exportó el supervisor con CairoSVG 2.9.1 a partir de los SVG aprobados. Los siete PNG originales y el favicon quedan intactos, y el 512 «any» es una copia del original. Los binarios y `exports.json` ya se incorporaron a la copia que se publicará, donde los 13 tests de icono pasan. Siguen ausentes de este worktree local, que contiene solo los SVG, el manifest y los tests: la comprobación de iconos de este worktree no refleja los binarios finales. Son dos estados distintos y solo el de la copia a publicar tiene los PNG.

## No ejecutado

- **Playwright.** Se ha comprobado solo el descubrimiento: 38 ejecuciones nuevas en 3 ficheros (`progress.spec.ts`: 14 por 2 proyectos; `offline.spec.ts`: 3 por 2 proyectos; `pwa-update.spec.ts`: 4, solo escritorio). **Ninguna se ha ejecutado**, de modo que el progreso en el navegador, el juego sin conexión y la actualización de la PWA siguen sin verificar en Chromium.
- La batería final (`validate`, `test`, `test:e2e`, `docs:check`) sobre el estado definitivo.
- La CI de GitHub con estos cambios: pendiente.
- Navegadores distintos de Chromium, dispositivos reales y la instalación de la PWA en un móvil.

## Defectos detectados en la validación

Ninguno era del producto:

- Un error de tipos de tupla en `offline.spec.ts`, detectado por el supervisor y corregido.
- Un defecto de planteamiento del E2E de cuota llena, también detectado por el supervisor. Guardaba reconocimiento, llenaba la cuota y después configuraba rutas esperando un fallo inmediato, pero esa configuración serializa 7 caracteres menos que la de reconocimiento y se guarda aun con la cuota llena. El test esperaba por eso un `write-failed` que no se produce y tomaba una instantánea inválida. Corrección: configurar rutas antes de llenar y de tomar la instantánea; después, llenar la cuota real, abrir una pregunta y verificar, lo que añade un contador nuevo, el documento crece y la escritura falla. Tras actualizar, lo guardado es el contador de reconocimiento 1/1 y la configuración de rutas (Drop 2 set 1, mayor, II → V); el contador de rutas 1/1 solo estaba en memoria y se pierde. La corrección está escrita y **no se ha ejecutado**. La producción no cambió.

## Revisar

- Que el texto del aviso de pérdida y el de cuota llena sean claros para quien juega.
- Que los iconos PNG que incorpore el supervisor coincidan con los SVG aprobados.
- El resultado del E2E de actualización en Chromium, sobre todo la subruta `/Drop_Route/`.
