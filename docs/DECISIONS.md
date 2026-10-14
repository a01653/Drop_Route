# Decisiones

## Confirmadas

Drop Route, repositorio a01653/Drop_Route, desarrollo de interfaz por Claude Code en terminal, primera etapa en C, tarjetas cortas de nuestra plantilla, gris antes de verificar y colores después, tres dificultades, arrastre y dos toques, rutas mediante formas dibujadas una candidata visible cada vez, documentación/tests/DTS como Mástil.

## Base técnica propuesta para DR-001

React, TypeScript, Vite y SVG. Vitest, ESLint y Playwright. Aplicación cliente sin backend. Elegir versiones compatibles y fijarlas en lockfile al ejecutar la tarea, sin copiar dependencias innecesarias de Mástil.

La preparación usa node:test para validar datos sin dependencias externas; no sustituye la futura suite de interfaz.

## Aplicado en DR-001 (integrado en main)

Son decisiones de implementación tomadas al ejecutar la orden. La fase está integrada en main tras su revisión.

- Versiones y compatibilidad en `docs/DTS.md`. TypeScript se queda en la serie 6.0 porque typescript-eslint no admite la 7. El mínimo de Node pasa a 22.13 por las herramientas.
- Los tests de la base se conservan con node:test y no se migran a Vitest. `npm test` ejecuta ambos y Vitest excluye `tests/`, `e2e/` y los worktrees.
- Capas `src/data`, `src/music`, `src/session` y `src/ui`, con dependencias en un solo sentido que ESLint hace cumplir. Los JSON de `data/` se importan sin copiarlos.
- Playwright genera el build y lanza vite preview durante la prueba y lo detiene al acabar. No se inicia ningún preview fuera de los E2E.
- La versión del paquete sigue en 0.0.0, porque aún no hay un juego que entregar.
- Python se localiza con un lanzador portable (`scripts/run-python.mjs`), no con `python3` directo, para que `data:check` y `docs:build` funcionen en Windows. Exige 3.10 o superior y la CI usa 3.10.
- El workflow ejecuta cada comprobación como un paso separado en lugar de `npm run validate`, para que cada fallo se vea por su nombre. `validate` sigue siendo el agregado local.
- `FILES_SHA256.json` y `RECOVERY_STATUS.json` se mantienen como instantáneas históricas de la base inicial. No se editan y no se presentan como estado actual.
- Para poder regenerar el DTS: `.gitattributes` fija LF para `.tex`, y el script y la plantilla admiten Pandoc 3.12.1 y las rutas temporales cortas de Windows.

## Aplicado en DR-002 (integrado en main)

Decisiones de implementación tomadas al ejecutar la orden. La fase está integrada en main y el icono está aprobado.

- Renderizador SVG propio en `src/ui/card/`. La geometría es una función pura y la vista neutra solo recibe posiciones, de modo que no puede mostrar la solución. Las medidas y los colores salen de la plantilla y un E2E los compara con su DOM, para las 112 formas.
- La ventana de trastes es común a las cuatro calidades de un set e inversión, como en la plantilla, y se calcula desde la posición física. Cuenta el traste de la sexta de C6 como la plantilla, sin dibujarla ni añadirla al ejercicio: las cuatro tarjetas de Drop 2+4 set 1, 3ª inversión, empiezan en el traste 12 (decisión del usuario del 13/10/2026) con las mismas notas en los trastes 13 a 15.
- Vista neutra: fondo `#F4F6FB`, borde `#CFD5E8` y círculos `#C8CDE0` con borde `#6D7699`. La plantilla no tiene vista neutra, así que son grises elegidos aquí. Su nombre accesible lista solo las posiciones, que son la pregunta.
- Se reutilizan Gochi Hand y Caveat Brush, que la plantilla incrusta, con sus licencias SIL OFL y 87 kB de peso. Se incluyen junto a las tarjetas. Si se prefiere una fuente de sistema, basta con cambiar `card.css`.
- Los bemoles se dibujan como trazo vectorial porque la fuente manuscrita no tiene ♭. En texto de la interfaz se escriben con ♭.
- Pantalla de revisión en `#/revision`, enlazada desde el arranque. No es un juego y enseña las tarjetas en el orden de la plantilla, no en el de una pregunta. El enrutado es un hash, sin librería.
- Icono en `assets/icon/`: fondo `#0B1D2E`, mástil de cuatro cuerdas y cuatro círculos con los colores de raíz, tercera, quinta y séptima unidos como ruta. Se usa como favicon. Los tamaños de la PWA y el maskable se añadieron en DR-006.
- Sin dependencias nuevas: las exportaciones PNG las genera el Chromium de Playwright y los tests decodifican el PNG sin librerías.
- `.gitattributes` fija LF para `.svg` y `.yml`, porque se verifican por hash o por contenido y en Windows se escribían con CRLF.

## Aplicado en DR-003 y DR-004 (integrado en main)

Decisiones de implementación tomadas al ejecutar el bloque. El bloque está integrado en main tras su revisión.

- Bloque autorizado por el usuario el 13/10/2026: DR-003 y DR-004 en feat/recognition-game, sin aprobación intermedia. Las reglas de bloques están en AGENTS.md.
- La sesión es un reductor puro (`reduceSession`) con tres fases (menú, pregunta, verificada). Las semillas llegan en la acción: el azar de producción vive en la interfaz y los tests usan semillas fijas.
- Orden de los cuatro botones de acorde: aleatorio por pregunta. Orden de los desplegables: fijo (Cmaj7, C7, Cm7, Cm7(b5); Fundamental a 3ª).
- Siguiente solo aparece tras verificar: no se puede saltar una pregunta sin contestarla. Se sale con Salir.
- Difícil es medio más los cuatro grados: exige acorde, inversión y los cuatro destinos para verificar.
- Banco de grados fijo y único para todas las preguntas: 1, 3, ♭3, 5, ♭5, 7 y ♭7. No incluye el ♭♭7 de la disminuida, que no se pregunta.
- Dos toques: ficha y destino, o destino ocupado y otro destino (mueve o intercambia). Colocar una ficha en un círculo ocupado devuelve la anterior al banco. Un botón «Devolver al banco» y arrastrar al banco devuelven una ficha. Escape cancela y Supr quita el grado de un círculo.
- Los destinos son botones HTML colocados sobre los círculos de la tarjeta neutra. Su área es la celda completa del círculo (mayor que el círculo, menor de 48 px de alto) para no solaparse con la cuerda contigua. Las fichas, botones y desplegables sí miden 48 px o más.
- Las fichas del banco son grises y sin color musical antes de verificar. Tras verificar el tablero se sustituye por la tarjeta de solución y la corrección lista cada círculo con su cuerda y traste.
- Ajustes de la revisión del bloque (13/10/2026): en fácil, tras verificar un error, el botón elegido va en rojo con ✗ y el correcto en verde con ✓ (la descripción accesible dice «Respuesta correcta» o «Tu respuesta, incorrecta» sin cambiar el nombre del botón). En difícil se conserva el tablero y se añade «Colocar sin arrastrar», con cuatro botones de 48 px o más identificados por cuerda y traste, que usan las mismas acciones y no revelan nada. La ficha del arrastre táctil va 64 px por encima del dedo y el destino se detecta con las coordenadas reales del dedo; con ratón no se desplaza.
- Sin puntuación en DR-003 y DR-004. Los contadores de intentos y aciertos llegaron con el progreso local de DR-006; la puntuación detallada sigue pendiente de decisión.
- El menú mostraba «Rutas II-V-I: próximamente» como texto; DR-005 lo sustituyó por el juego.

## Aplicado en DR-005 (integrado en main)

Decisiones de implementación tomadas al ejecutar la orden. La fase está integrada en main (véase el registro de validación de DR-005).

- Menú: el juego de rutas pide Drop 2 (sets 1 y 2, los que tienen rutas), modo (mayor o menor) y tramo; no tiene dificultad. Reconocimiento conserva todas las familias.
- Tramos: «II → V», «V → I» y «II → V → I». El tercero es el encadenado que pide el DTS («si falla el V, el V-I parte del V correcto de esa ruta»): el V-I sigue al II-V de la misma ruta y después se elige otra.
- Las cuatro candidatas de una pregunta son el mismo paso de las cuatro rutas del set y modo (una por inversión). No se inventa ninguna posición: salen de data/routes.json.
- La candidata que se ve es la respuesta, empezando por la 1; no hay un estado «sin elegir». Verificar está siempre habilitado y no hay verificación automática al cambiar de candidata.
- Redacción: «Es la de nuestra ruta» y «No es la de nuestra ruta … Es otra posición válida de G7»; nunca «incorrecto». Verde con ✓ y ámbar con ✗, siempre con texto.
- Tras verificar, «Tu respuesta» y «Solución» se alternan con dos botones y se ve un solo diagrama además de la partida; por defecto, la solución.
- Las tarjetas de ruta usan la ventana de trastes por posición física y no la ventana común de la ruta de la plantilla, porque esa ventana delata la candidata correcta. Otras diferencias con las láminas de ruta: no se dibuja C6.
- Deslizamiento opcional con un umbral de 48 px y predominio horizontal; en los extremos no da la vuelta. Flechas del teclado sobre el selector.
- Ajuste de la revisión (14/10/2026; la CI quedó verde después, véanse los hechos posteriores del registro de DR-005): tras verificar el selector 1 a 4 no desaparece, queda bloqueado y marcado como los botones de acorde de fácil. Si la elegida no coincide con nuestra ruta va en rojo con ✗ y la de nuestra ruta en verde con ✓; si coincide, la elegida en verde con ✓. `aria-pressed` solo en la elegida y estado en la descripción accesible, sin cambiar el nombre «Candidata n». El rojo del botón significa «no es la de nuestra ruta»; el texto conserva «otra posición válida». El veredicto sigue en ámbar para no presentar la alternativa como error. Tu respuesta/Solución no cambia la elegida y Siguiente deja el selector libre y sin marcas.

## Aplicado en DR-006 (pendiente de revisión)

Decisiones de implementación tomadas al ejecutar la orden en la rama feat/progress-and-pwa, no confirmadas todavía por el usuario. El bloque DR-006 + DR-007 está autorizado; esta fase no regenera LaTeX/PDF ni prepara manuales, y la política documental sigue en deferred. Las comprobaciones y su estado están en `docs/validation/2026-10-14-dr-006-progress-and-pwa.md`.

Progreso:

- Capa nueva `src/progress`, entre la sesión y la interfaz y sin React. Un reductor puro (`reduceApp`) envuelve al de la sesión y decide, en la misma transición, si cuenta un intento; un almacén sin React (`createAppStore`) escribe tras cada cambio. El único sitio que toca `localStorage` es `src/ui/browserStorage.ts`.
- Se cuenta una pregunta al pasar de abierta a verificada, que la sesión permite una vez. Contadores: reconocimiento por set y dificultad; rutas por set, modo y tramo (II → V o V → I). «II → V → I» suma cada mitad en la suya. Es acierto el acierto completo del nivel o, en rutas, la candidata exacta. Ver la corrección, cambiar de vista, Siguiente y Salir no cuentan.
- Solo contadores, sin puntos, rachas ni clasificaciones; la puntuación detallada sigue pendiente. El panel «Tu progreso» muestra totales por juego, lo de la configuración elegida y el detalle plegado.
- Un documento en una única clave, `drop-route:state`, con `schemaVersion`, la configuración y los contadores. El esquema vigente es el 1, independiente de la versión del paquete (0.0.0). Se guarda en un orden fijo y no se escribe si no hay nada nuevo.
- El esquema 0 es un formato de prueba (fixture), no una versión pública anterior: Drop Route no había publicado ningún guardado. Existe para ejercitar de verdad la cadena de migración antes de que haga falta una real.
- Copia antes de reparar o migrar: `drop-route:state:damaged` para datos ilegibles o reparados dentro del esquema vigente, y `drop-route:state:v<n>` con el original anterior a migrar desde el esquema n. Cada una es un único hueco que una copia posterior sustituye. Si la copia falla, el original no se reescribe, la sesión no escribe nada y se juega en memoria con un aviso que dice que se perderá al cerrar.
- Un documento de un esquema posterior se conserva intacto: la sesión no escribe y se avisa. Los contadores y configuraciones inválidos se descartan uno a uno, conservando los válidos. No hay pantalla para recuperar las copias.
- Cuota llena o almacenamiento bloqueado: se avisa, se sigue jugando en memoria y, si estaba lleno, se reintenta con el próximo cambio.
- Al abrir la página se vuelve siempre al menú con la última configuración; no se reanuda una pregunta abierta.

PWA:

- Un service worker generado en cada build (`scripts/pwa/sw.template.js`, rellenado por `scripts/lib/pwa-build.mjs` desde un plugin de Vite) que precachea solo los recursos propios del build. No se precachean las referencias, los PDF ni los mapas de código.
- La versión del conjunto es un hash del contenido de los recursos y del texto de la plantilla del worker: si solo cambia su lógica, también cambia la caché. La caché se llama `drop-route-precache:<ámbito>:<versión>` y la base de publicación forma parte del nombre, para que dos instalaciones en el mismo origen no se borren las cachés.
- Una versión nueva se instala en su propia caché y espera. Nunca se activa sola, para no mezclar los recursos de dos versiones ni perder una pregunta abierta. Se ofrece solo en el menú; la activación la pide la persona, el worker toma el control y la página se recarga una vez. Al activarse solo borra las cachés propias de otras versiones en su ámbito. Una instalación fallida no deja una caché a medias ni toca la del worker activo.
- Si lo que hay en la página no está guardado en el dispositivo, el aviso de actualización lo dice y ofrece «Actualizar y perder lo no guardado» en lugar de «Actualizar ahora».
- El worker solo usa la Cache API y la red; no toca `localStorage`. Por eso actualizar no borra el progreso.
- La base se fija con `DROP_ROUTE_BASE` (`/` por defecto, o una ruta absoluta como `/Drop_Route/`). El manifest usa rutas relativas. El service worker solo se registra en el build, no con `npm run dev`.
- Iconos de la PWA a partir del icono aprobado, sin cambiarlo: 192 y 512 «any» y un 512 maskable que es el mismo dibujo al 80 % dentro de la zona segura. El PNG de 192 y el maskable de esta entrega los generó el supervisor con CairoSVG 2.9.1; el 512 «any» es el aprobado. Los iconos finales están versionados en `public/icons/`, de modo que el build no necesita Chromium.
- Fuera de alcance: cuentas, backend, sincronización, notificaciones, exportar o recuperar copias desde la interfaz y cualquier ampliación. La versión sigue en 0.0.0 porque esta entrega aún no se ha publicado ni etiquetado.

## Pendiente

Puntuación detallada; estudio, repaso y audio; transposición; C6/dim7 evaluables; alojamiento y flujo de despliegue; licencia del código nuevo; si la interfaz debe permitir recuperar las copias de seguridad del progreso. Las referencias conservan su autoría. El icono ya está aprobado.

El 13/10/2026 el usuario autorizó la publicación de la base completa en el repositorio público, incluyendo la plantilla HTML y las dos guías originales. Esta orden cubre la entrega inicial, no implementaciones o publicaciones futuras.

## Calendario documental, 13/10/2026

Por decisión del usuario, DR-001 a DR-006 actualizan DTS Markdown, README, instrucciones y evidencia de validación. La generación de LaTeX/PDF, los manuales completos, las capturas y la revisión visual documental se aplazan a DR-007 para reducir el tiempo de cada fase. Los tests y las auditorías no se aplazan.

docs:check sigue verificando la documentación y la integridad de los derivados conservados, y declara las fuentes pendientes de regenerar. docs:check:final exige sincronización completa aunque la política siga en modo deferred. DR-007 cambia la política a required y mantiene ese control en la CI de cierre.
