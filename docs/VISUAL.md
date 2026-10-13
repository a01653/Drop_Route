# Apariencia y tacto

La referencia es references/laminas-drop-original.html. Conservar cuerdas horizontales, numeración 1-6, marcas de cuerdas no tocadas y círculos centrados entre los trastes sobre su cuerda.

Ventana corta con el número de trastes necesario. No imponer tres si una forma de la fuente necesita cinco. Proporciones de referencia: traste 44, separación de cuerdas 20, círculo de diámetro 18 y tinta #14183A. Aumentar tamaño táctil manteniendo geometría.

| Elemento en solución | Color |
| --- | --- |
| Raíz | #E11D48 |
| Tercera | #0284C7 |
| Quinta | #059669 |
| Séptima | #EDBC07 |
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

## Grados

Arrastre con tolerancia y ficha desplazada del dedo; también tocar ficha y tocar destino y operación por teclado. Mover, sustituir o devolver fichas antes de verificar. Un grado no ocupa dos destinos.

## Icono

Drop Route: fondo azul oscuro, fragmento de mástil y círculos de colores conectados como ruta. Sin letras o números. Debe distinguirse a 32 px. DR-002 creó el original editable y sus exportaciones en `assets/icon/` (ver su README) y quedan pendientes de aprobación visual; DR-006 incorpora tamaños PWA y variante maskable.

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

**Ventana con la sustitución C6.** La plantilla cuenta en la ventana el traste de la sexta de C6 (la séptima mayor del Cmaj7 bajada dos trastes en su cuerda) en nueve grupos de set e inversión. Aquí C6 no es evaluable y no se dibuja ni se añade a ningún ejercicio, pero la ventana conserva ese encuadre. Solo cambia una: Drop 2+4 set 1, 3ª inversión, cuyas cuatro tarjetas empiezan en el traste 12 (trastes 12 a 16) y no en el 13, porque la sexta cae en la cuerda 5, traste 12. Sus notas siguen en los trastes 13, 14 y 15, sin cambios, y la columna del traste 12 queda vacía. En los otros ocho grupos la sexta no queda por debajo de las demás notas y la ventana es la misma con o sin ella. Un E2E comprueba las 112 ventanas contra el DOM de la plantilla, sin excepciones.

**Vista neutra.** Fondo `#F4F6FB` y borde `#CFD5E8` para cualquier forma, y círculos iguales de relleno `#C8CDE0` y borde `#6D7699`. Estos cuatro grises no salen de la plantilla, que no tiene vista neutra; se eligieron con contraste suficiente sobre el fondo. No lleva nombre, familia, grados, colores musicales, identificadores, títulos ni atributos de datos. Su nombre accesible lista solo las posiciones («cuerda 4, traste 10; …»), que son la pregunta.

**Vista de solución.** Fondo y borde de cada calidad, círculos con el color de la función del grado y su etiqueta. El color depende de la función: b3 es tercera y b5 es quinta. El nombre accesible añade el nombre, la inversión y cada grado dicho en voz alta («bemol 3»).

**Bemoles.** Se dibujan como trazo vectorial dentro del círculo, porque Gochi Hand no tiene el glifo ♭ y los símbolos del sistema varían de un dispositivo a otro. En texto de la interfaz se escriben con ♭.

**Pantallas de juego (DR-003 y DR-004).** El menú (Drop, set con sus cuerdas, dificultad y Empezar) y la pregunta usan las mismas tarjetas aprobadas. Antes de verificar la tarjeta es la vista neutra; al verificar pasa a la de solución. En fácil, cuatro botones de acorde en dos columnas, en orden variable; en medio, dos desplegables nativos, Acorde e Inversión; en difícil, además, el banco de siete grados grises bajo la tarjeta y cuatro destinos sobre sus círculos (línea de puntos si están vacíos, círculo gris con el grado si están ocupados, anillo azul al sostener una ficha). La corrección marca cada campo con ✓ o ✗, la palabra «correcto» o «incorrecto» y un color verde o rojo, y el botón elegido en fácil queda marcado. Los controles miden 48 px o más; los destinos de difícil son la celda del círculo. Máximo de 30 rem de ancho, centrado.

**Fuentes.** Gochi Hand y Caveat Brush, extraídas sin modificar de la plantilla, con sus licencias SIL OFL en `src/ui/card/fonts/`. Suman 87 kB y el navegador las descarga al mostrar tarjetas.
