# Validación del bloque DR-003 + DR-004: reconocimiento

Fecha 13/10/2026. Rama feat/recognition-game, creada desde main en 97d386b (DR-002 integrada por fast-forward; Actions 38470264898 correcto). Bloque autorizado expresamente por el usuario: DR-003 y después DR-004 en la misma rama, sin aprobación intermedia, con revisión humana al terminar. No se ha regenerado el LaTeX ni el PDF del DTS ni se han preparado manuales.

Entorno: Windows Server 2019, Node.js 26.3.1, npm 11.17.0, Python 3.13.7, Chromium de Playwright 1.64.0. No se han añadido dependencias.

## Preparación del bloque

AGENTS.md, CLAUDE.md, docs/work-orders/README.md y las órdenes DR-003 a DR-007 admiten ahora bloques autorizados expresamente (DR-003 con DR-004, DR-005 por separado, DR-006 con DR-007): una rama por bloque, pruebas entre fases con resultados registrados, revisión humana al terminar y sin cambiar las reglas de commit, merge, tag y push. Es un cambio de reglas pedido por el usuario en esta petición.

## Fase DR-003: reconocimiento fácil y medio

Alcance: menú de configuración (R01), preguntas sin respuesta visible (R02), cuatro botones en fácil (R03) y dos desplegables en medio (R04), Verificar solo con la respuesta completa (R06), bloqueo y corrección por campos con texto, símbolo y color (R07, R08), Siguiente (R09) y Salir (R10). Sin fichas de grados, rutas ni persistencia.

Pruebas dirigidas, ejecutadas antes de pasar a DR-004:

| Comprobación | Resultado |
| --- | --- |
| Vitest | 10 ficheros y 87 tests correctos (37 nuevos: sesión, preguntas, corrección y pantallas). |
| E2E | 53 correctos: los 27 anteriores y 26 nuevos (13 de reconocimiento por proyecto). Antes de llegar a verde se corrigieron dos localizadores ambiguos de los propios tests; ningún fallo del producto. |
| lint, typecheck | Correctos, sin avisos. |
| docs:check | Correcto. DTS declarado pendiente de DR-007. |

Control negativo: añadir `data-quality` con la calidad real al DOM de la pregunta hizo fallar la prueba de «sin pistas»; se revirtió.

## Fase DR-004: grados difíciles

Alcance: banco fijo de siete grados, cuatro destinos sobre la tarjeta neutra, arrastre, dos toques y teclado, reasignar o devolver antes de verificar y corrección por destino con aciertos parciales.

Pruebas dirigidas, ejecutadas antes de la documentación y la batería final:

| Comprobación | Resultado |
| --- | --- |
| Vitest | 13 ficheros y 123 tests correctos (36 nuevos: banco, acciones de grados con 200 secuencias aleatorias, corrección difícil, pantalla). |
| E2E de grados | 26 correctos (13 por proyecto): dos toques, arrastre con ratón, arrastre con eventos táctiles reales de Chromium, soltar fuera, pointercancel, cambio, sustitución, intercambio, devolución, cancelación, teclado, aciertos parciales, b3/b5/b7 reales, siete sets y 360, 390 y 430 px. |
| lint, typecheck | Correctos, sin avisos. |

Control negativo: con el umbral de arrastre inflado, fallaron las dos pruebas de arrastre del E2E (escritorio); se revirtió. El arrastre táctil se prueba solo en el proyecto móvil, con eventos táctiles de CDP, y en escritorio con el ratón.

## Batería final del bloque (primera versión, anterior a los ajustes)

Sustituida por la de la sección «Ajustes de la revisión».

| Comando | Resultado |
| --- | --- |
| npm run validate | Correcto: data:check y audit:music (124 posiciones, 112 evaluables, 16 rutas, sin cambios en los datos), node:test 51 correctos (0 fallos, 0 omitidos), Vitest 13 ficheros y 123 tests correctos, docs:check correcto con 27 documentos y el DTS declarado pendiente de DR-007. |
| npm run lint | Correcto, sin avisos. |
| npm run typecheck | Correcto, aplicación y herramientas. |
| npm run build | Correcto: 46 módulos. JavaScript 301,13 kB (90,46 kB comprimido), CSS 9,46 kB y las dos fuentes. |
| npm run test:e2e | 79 correctos en 38,6 s y ninguno omitido: 5 de humo, 8 de tarjetas, 13 de reconocimiento y 13 de difícil por proyecto, y 1 comparación con la plantilla. |
| npm run docs:check:final | Rechazo esperado, código 1: DTS pendiente de regenerar hasta DR-007. |

No hay advertencias en ninguna salida y no queda ningún servidor escuchando en los puertos 4173 y 4180.

## Ajustes de la revisión (14/10/2026)

La revisión de DR-003 + DR-004 pidió dos ajustes antes del merge, ejecutados en la misma rama:

1. Fácil: tras un error, el botón elegido en rojo con ✗ y el correcto en verde con ✓, aria-pressed solo en el elegido, los cuatro botones bloqueados y ninguna pista antes de verificar.
2. Difícil: se conserva la geometría y el arrastre sobre los círculos; se añade «Colocar sin arrastrar» (cuatro botones de 48 px o más, por cuerda y traste, con las mismas acciones y sin revelar la solución) y la ficha del arrastre táctil va por encima del dedo, detectando el destino con las coordenadas reales del dedo.

Pruebas añadidas: Vitest (5 de marcas en fácil, 3 de la alternativa compacta) y E2E (3 anchos de fácil, 3 anchos de «Colocar sin arrastrar» y 1 de la ficha del arrastre, por proyecto donde corresponde).

Control negativo pedido: las pruebas del botón correcto se escribieron antes del cambio y, contra el código anterior, fallaron tres (marca del correcto, aria-pressed y bloqueo, y descripción accesible), mientras pasaban las de «sin pistas» antes de verificar. Tras el cambio pasan todas. Con la ficha del arrastre sin desplazamiento, la prueba táctil falla en el proyecto móvil; se revirtió.

Una prueba E2E de la posición de la ficha falló una vez en la batería por medirla antes de que React pintara el último movimiento; era una carrera del test, no del producto. Se corrigió esperando a que la posición se asiente y se repitió tres veces seguidas sin fallos.

Una segunda ejecución de la batería falló en dos E2E de fácil por otro defecto del propio test: buscaba el botón con `startsWith('Cm7')`, que también casa con `Cm7(b5)` según el orden aleatorio. Se cambió por coincidencia exacta. Tras ello, la batería se ejecutó sobre el estado definitivo y el E2E completo se repitió dos veces seguidas, con 93 correctos las dos veces.

Batería final sobre el estado definitivo:

| Comando | Resultado |
| --- | --- |
| npm run validate | Correcto: datos y auditoría sin cambios, node:test 51 correctos, Vitest 13 ficheros y 131 tests correctos, docs:check correcto con 27 documentos y el DTS pendiente de DR-007. |
| npm run lint | Correcto, sin avisos. |
| npm run typecheck | Correcto. |
| npm run build | Correcto: JavaScript 302,39 kB (90,83 kB comprimido), CSS 10,54 kB. |
| npm run test:e2e | 93 correctos, ninguno omitido. |
| npm run docs:check:final | Rechazo esperado, código 1: DTS pendiente de regenerar hasta DR-007. |

Capturas de los ajustes, a 360 px, que sustituyen o amplían las anteriores:

| Captura | Contenido |
| --- | --- |
| [facil-correccion-error-360.png](capturas-dr-003-004/facil-correccion-error-360.png) | Error en fácil: elegido en rojo con ✗, correcto en verde con ✓, resto apagado. Sustituye a la anterior. |
| [dificil-colocar-sin-arrastrar-360.png](capturas-dr-003-004/dificil-colocar-sin-arrastrar-360.png) | Los cuatro botones por cuerda y traste, con dos grados colocados. Nueva. |
| [dificil-arrastre-360.png](capturas-dr-003-004/dificil-arrastre-360.png) | Arrastre táctil real con la ficha por encima del dedo. Sustituye a la anterior. |

Las demás capturas de difícil (pregunta, colocando, lista para verificar y corrección parcial) son anteriores a «Colocar sin arrastrar» y no muestran esa sección.

## Sin pistas

Comprobado con Vitest sobre los siete sets y con E2E en el navegador: la pregunta usa la vista neutra (círculos grises iguales, sin nombre, familia, colores musicales, identificadores ni atributos de datos), el nombre accesible de la tarjeta y de cada destino lista solo cuerda y traste, y el orden de los botones de acorde no depende de la respuesta. El banco de grados es el mismo en todas las preguntas y tiene siete grados, tres más que los cuatro de cualquier forma. La respuesta correcta en el E2E se deduce de las posiciones visibles y de data/catalog.json, sin semilla de pruebas.

## Capturas de revisión

En [capturas-dr-003-004](capturas-dr-003-004/), a 360 px y densidad 2, con Chromium sobre el build de esta rama servido con `vite preview` en un puerto aparte, ya detenido. No son las capturas de los manuales, que siguen aplazadas a DR-007.

| Captura | Contenido |
| --- | --- |
| [menu-360.png](capturas-dr-003-004/menu-360.png) | Menú: Drop, set con cuerdas y dificultad. |
| [facil-pregunta-360.png](capturas-dr-003-004/facil-pregunta-360.png) | Pregunta fácil: tarjeta neutra y cuatro botones. |
| [facil-correccion-error-360.png](capturas-dr-003-004/facil-correccion-error-360.png) | Fácil con error: respuesta marcada, solución y tarjeta de colores. |
| [medio-respuesta-360.png](capturas-dr-003-004/medio-respuesta-360.png) | Medio: dos desplegables rellenos antes de verificar. |
| [medio-correccion-parcial-360.png](capturas-dr-003-004/medio-correccion-parcial-360.png) | Medio con acorde correcto e inversión fallida. |
| [dificil-pregunta-360.png](capturas-dr-003-004/dificil-pregunta-360.png) | Difícil: destinos vacíos y banco. |
| [dificil-colocando-360.png](capturas-dr-003-004/dificil-colocando-360.png) | Difícil: tres grados colocados y una ficha en la mano. |
| [dificil-arrastre-360.png](capturas-dr-003-004/dificil-arrastre-360.png) | Difícil: arrastre táctil en curso. |
| [dificil-lista-para-verificar-360.png](capturas-dr-003-004/dificil-lista-para-verificar-360.png) | Difícil: los cuatro destinos, acorde e inversión elegidos. |
| [dificil-correccion-parcial-360.png](capturas-dr-003-004/dificil-correccion-parcial-360.png) | Difícil: un grado equivocado y cinco campos correctos. |

## No comprobado

- Dispositivos reales, Safari, Firefox y WebKit: las pruebas móviles usan emulación de Chromium, y el arrastre táctil, eventos táctiles de Chromium.
- La CI de GitHub no se ha ejecutado con estos cambios hasta publicar la rama.
- Los destinos de difícil miden unos 55 por 25 px a 360 px (la celda del círculo): mayores que el círculo, pero menores de 48 px de alto. Decisión a revisar.
- No hay puntuación ni contadores de sesión, rutas II-V-I, progreso ni PWA.
- El LaTeX y el PDF del DTS no se han regenerado, por el calendario documental; el DTS Markdown está actualizado.
