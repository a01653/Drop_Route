# Apariencia y tacto

La referencia es references/laminas-drop-original.html. Conservar cuerdas horizontales, numeración 1-6, marcas de cuerdas no tocadas y círculos centrados entre los trastes sobre su cuerda.

Ventana corta con el número de trastes necesario. No imponer tres si una forma de la fuente necesita cinco. Proporciones de referencia: traste 44, separación de cuerdas 20, círculo de diámetro 18 y tinta #14183A. Aumentar tamaño táctil manteniendo geometría.

| Elemento en solución | Color |
| --- | --- |
| Raíz | #E11D48 |
| Tercera | #0284C7 |
| Quinta | #059669 |
| Sexta o séptima | #EDBC07 |
| Mayor 7, fondo | #EAF4FE |
| Dominante, fondo | #E7F8F3 |
| Menor 7, fondo | #EFEAFC |
| Semidisminuido, fondo | #FDF6E2 |

## Evitar pistas

Círculos grises iguales y fondo común antes de verificar. Sin nombre de acorde, inversión, notas o grados en títulos, tooltips o nombres accesibles de las opciones. Trastes y cuerdas sí visibles.

Banco fijo de grados 1, 3, b3, 5, b5, 7 y b7. Elegir cuatro, sin duplicar ficha. Ofrecer solo los grados correctos revelaría la calidad.

En solución recuperar colores musicales. Usar borde, símbolos y texto para corrección sin sustituir el color del grado. Mostrar alteraciones como glifos de bemol en la interfaz.

## Móvil y rutas

Partida arriba, candidata grande debajo, selector 1/2/3/4 y Verificar/Siguiente. Botones numerados sin nombres de inversión. Cambiar candidato no cambia partida ni registra intento.

Tras error, marcar elegida y correcta con texto y rojo/verde. Tu respuesta/Solución alterna los dibujos. Áreas táctiles de al menos 48 CSS px aunque el círculo sea menor.

## Escritorio responsive (DR-009)

A partir de 960 px no se conserva una columna de móvil centrada. Se usa el ancho de la pantalla sin convertir el mástil corto en un diagrama artificialmente largo.

- Menú: configuración en la zona principal y progreso/estado en una columna lateral.
- Reconocimiento: tarjeta a la izquierda y respuesta/corrección a la derecha.
- Rutas: partida y candidata en paralelo; tras verificar, comparación y selección aprovechan dos columnas.
- Modo estudio: controles en una columna lateral estable y forma o ruta en el área principal.
- Los contenedores de escritorio llegan aproximadamente a 82-88 rem; la tarjeta de mástil mantiene un máximo razonable.
- Por debajo de 960 px se conserva el flujo móvil y las pruebas existentes de 360, 390 y 430 px siguen siendo la referencia de ausencia de desplazamiento horizontal.

## Grados

Arrastre con tolerancia y ficha desplazada del dedo; también tocar ficha y tocar destino y operación por teclado. Mover, sustituir o devolver fichas antes de verificar. Un grado no ocupa dos destinos.

## Icono

Drop Route: fondo azul oscuro, fragmento de mástil y círculos de colores conectados como ruta. Sin letras o números. Debe distinguirse a 32 px. DR-002 creó el original editable y sus exportaciones en `assets/icon/` (ver su README); el usuario aprobó el icono. DR-006 añadió los tamaños de la PWA (192 y 512) y la variante maskable, que es el mismo dibujo al 80 % centrado en la zona segura sobre un fondo opaco `#0B1D2E`, sin cambiar el original aprobado ni sus siete PNG.

## Tarjetas implementadas (DR-002)

El renderizador está en `src/ui/card/`. La pantalla de revisión `#/revision` muestra las 112 formas por set, en vista neutra o de solución. Las medidas y los colores proceden de la plantilla; un E2E las compara con su DOM renderizado, tarjeta a tarjeta.

| Elemento | Valor |
| --- | --- |
| Traste, cuerda, círculo, cejuelo | 44, 20, 18 y 5 unidades. El cejuelo solo si la ventana empieza en el traste 1. |
| Mástil | Seis cuerdas y cinco columnas de trastes: 221 por 101 unidades dentro de un lienzo de 264 por 166. |
| Centrado | El centro de cada círculo está a mitad de su columna y sobre su cuerda. |
| Cuerdas no tocadas | Una × sobre la primera línea de traste. |
| Numeración | Cuerdas 1 a 6 a la izquierda y trastes debajo, en Gochi Hand. |
| Nombre | Solo en la solución, en Caveat Brush, con la familia a la derecha en mayúsculas. |

**Ventana de trastes.** Es común a las cuatro calidades de un set e inversión y empieza en el traste más bajo de ese grupo, como en la plantilla (con la salvedad de C6 que se explica abajo). Así las cuatro tarjetas de una columna comparten numeración y fondo, y la ventana no delata la calidad. Las 28 ventanas caben en cinco columnas, de modo que nada se recorta. Se calcula desde la posición física, nunca desde la inversión o la calidad declaradas.

**Ventana y variante C6.** La plantilla cuenta en la ventana el traste de la sexta de C6: la séptima mayor del Cmaj7 bajada dos trastes en su cuerda. En los juegos evaluables C6 no se dibuja ni se añade como calidad; la ventana conserva ese encuadre. En modo estudio, desde DR-009 sí se dibuja la alternativa sobre una copia derivada, con la voz trasladada dos trastes y rotulada como grado 6 en el mismo color dorado de la función superior. La etiqueta pasa a `Cmaj7 – C6` y se transpone junto con la forma. Drop 2+4 set 1, 3ª inversión, mantiene la ventana desde el traste 12 porque la sexta cae en la cuerda 5, traste 12. Un E2E sigue comparando las 112 ventanas evaluables contra el DOM de la plantilla, sin excepciones.

**Vista neutra.** Fondo `#F4F6FB` y borde `#CFD5E8` para cualquier forma, y círculos iguales de relleno `#C8CDE0` y borde `#6D7699`. Estos cuatro grises no salen de la plantilla, que no tiene vista neutra; se eligieron con contraste suficiente sobre el fondo. No lleva nombre, familia, grados, colores musicales, identificadores, títulos ni atributos de datos. Su nombre accesible lista solo las posiciones («cuerda 4, traste 10; …»), que son la pregunta.

**Vista de solución.** Fondo y borde de cada calidad, círculos con el color de la función del grado y su etiqueta. El color depende de la función: b3 es tercera, b5 es quinta y 6 usa el color superior dorado. El nombre accesible añade el nombre, la inversión y cada grado dicho en voz alta («bemol 3»).

**Bemoles.** Se dibujan como trazo vectorial dentro del círculo, porque Gochi Hand no tiene el glifo ♭ y los símbolos del sistema varían de un dispositivo a otro. En texto de la interfaz se escriben con ♭.

**Pantallas de juego (DR-003, DR-004 y DR-009).** El menú (Drop, set con sus cuerdas, dificultad y Empezar) y la pregunta usan las mismas tarjetas aprobadas. Antes de verificar la tarjeta es la vista neutra; al verificar pasa a la de solución. En fácil, cuatro botones de acorde en dos columnas, en orden variable; en medio, dos desplegables nativos, Acorde e Inversión; en difícil, además, el banco de siete grados grises bajo la tarjeta y cuatro destinos sobre sus círculos (línea de puntos si están vacíos, círculo gris con el grado si están ocupados, anillo azul al sostener una ficha). La corrección marca cada campo con ✓ o ✗, la palabra «correcto» o «incorrecto» y un color verde o rojo. En fácil, tras un error, el botón elegido va en rojo con ✗ y el correcto en verde con ✓; los demás quedan apagados y los cuatro bloqueados. En difícil, bajo el banco, «Colocar sin arrastrar» ofrece cuatro botones de 56 px de alto, en dos columnas, con «Cuerda n · traste m» y el grado colocado (o «—»). Con el dedo, la ficha del arrastre se dibuja 64 px por encima del punto de contacto. Los controles miden 48 px o más; los destinos de difícil son la celda del círculo. En móvil el contenido conserva el ancho compacto centrado; en escritorio DR-009 usa el layout horizontal descrito arriba.

**Pantalla de ruta (DR-005).** En móvil, de arriba abajo: cabecera con Salir y «Drop 2 · set n · modo · tramo», «Pregunta n», la partida (tarjeta de solución con su nombre, siempre visible y fija), la pregunta «¿Qué G7 continúa la ruta?», una sola tarjeta neutra de la candidata, el pie «Candidata n de 4», el selector 1 a 4 (cuatro botones de 56 px de alto) y Verificar. La tarjeta admite deslizamiento horizontal además del selector. Tras verificar, el resultado con texto, símbolo y color (verde con ✓ o ámbar con ✗), Siguiente, el selector 1 a 4 (bajo «Candidatas») y un comparador con dos botones, «Tu respuesta» y «Solución», que muestra un único diagrama de solución de cada vez. El selector se conserva con los cuatro botones bloqueados: si la elegida no es la de nuestra ruta va en rojo con ✗ y la de nuestra ruta en verde con ✓; si coincide, la elegida va en verde con ✓. Las otras quedan apagadas y sin marca. `aria-pressed` es verdadero solo en la elegida; el nombre accesible sigue siendo «Candidata n» y el estado va en la descripción («Tu respuesta, no es la de nuestra ruta», «La de nuestra ruta», «Tu respuesta, la de nuestra ruta»). Antes de verificar no hay marcas ni descripciones. El rojo significa «no coincide con nuestra ruta», no que la posición sea musicalmente inválida, y el texto del resultado lo sigue diciendo («Es otra posición válida de G7»). Alternar «Tu respuesta» y «Solución» no cambia la elegida ni las marcas, y Siguiente devuelve una pregunta neutra con el selector libre y sin marcas. Nunca hay más de dos diagramas a la vez. Las ventanas de trastes se calculan por posición física y no por ruta (véase DTS). En escritorio, partida/candidata o partida/resultado se distribuyen en paralelo para aprovechar el ancho.

**Progreso y avisos (DR-006).** El menú incluye el panel «Tu progreso»: si aún no hay intentos, un texto lo dice; si los hay, totales de «Reconocer voicings» y «Rutas II-V-I» con la forma «7 de 10 (70 %)», la lista «Con lo que has elegido» (uno o dos contadores según la configuración) y «Ver todo el detalle» plegado. No hay puntos, rachas ni colores de valoración. Encima del menú pueden aparecer avisos con `role="status"`, de título y texto en español: sobre el almacenamiento (bloqueado, lleno, dañado, reparado, de formato anterior o de versión posterior, con o sin copia) y, aparte, el de «Hay una versión nueva de Drop Route». Solo los avisos de dañado y reparado se cierran con «Entendido». El de actualización solo sale en el menú; cuando lo que hay en la página no está guardado, el botón pasa a secundario y dice «Actualizar y perder lo no guardado». Un E2E comprueba que a 360, 390 y 430 px no hay desplazamiento horizontal y los controles miden 48 px o más.

**Fuentes.** Gochi Hand y Caveat Brush, extraídas sin modificar de la plantilla, con sus licencias SIL OFL en `src/ui/card/fonts/`. Suman 87 kB y el navegador las descarga al mostrar tarjetas.
