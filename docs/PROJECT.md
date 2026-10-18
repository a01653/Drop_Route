# Requisitos del producto

Propietario: Jesús Quevedo Rodríguez. Diseño acordado el 12/10/2026; base reconstruida el 13/10/2026.

## Alcance

Estudiar posiciones, inversiones, grados y rutas II-V-I concretas. Ordenador y móvil. Primera etapa de los juegos evaluables en C. Ventana corta del mástil con apariencia de las láminas, no un mástil de doce trastes.

| ID | Comportamiento |
| --- | --- |
| R01 | Elegir juego, Drop, set y dificultad. Mostrar las cuerdas del set. |
| R02 | Una posición sin respuesta visible por pregunta de reconocimiento. |
| R03 | Fácil: cuatro botones Cmaj7 / C6, C7, Cm7 y Cm7(b5), orden variable. La opción mayor agrupa ambas variantes y no cambia según la pregunta. |
| R04 | Medio: dos desplegables, acorde e inversión (Fundamental, 1ª, 2ª, 3ª). |
| R05 | Difícil: añade colocar grados sobre círculos grises, por arrastre o dos toques. |
| R06 | Verificar habilitado con respuesta completa. Seleccionar no verifica. |
| R07 | Tras verificar, bloquear respuesta, marcar resultado con rojo/verde y texto, conservar lo contestado y mostrar solución. |
| R08 | Corregir acorde, inversión y cada grado por separado; acierto completo exige todos los campos del nivel. |
| R09 | Siguiente genera otra pregunta; en reconocimiento se sortean con el mismo peso las tarjetas pendientes, sin repetir ninguna hasta agotar el set. Al empezar otra ronda tampoco se repite la última tarjeta si existe una alternativa. Sesión libre hasta Salir. |
| R10 | Salir vuelve al menú. |
| R11 | Rutas: elegir mayor/menor y un set con datos. Partida siempre visible. |
| R12 | Una candidata dibujada cada vez, botones 1/2/3/4 y deslizamiento opcional. |
| R13 | Verificar compara con la ruta exacta; Tu respuesta/Solución permite comparar sin cuatro diagramas simultáneos en móvil. |
| R14 | Practicar II-V y V-I; V-I parte del V correcto de esa ruta. |
| R15 | Fondo común y círculos neutros antes de verificar; sin etiquetas o colores que den pistas. Recuperar colores musicales en solución. |
| R16 | Operación con ratón, teclado y tacto; resultado comprensible sin distinguir colores. |
| R17 | Progreso local en el dispositivo: contadores de intentos y aciertos por juego, set y dificultad (reconocimiento) o set, modo y tramo (rutas), y la configuración del menú. Cada pregunta verificada cuenta una vez; el acierto completo exige todos los campos del nivel o la candidata de nuestra ruta. |
| R18 | Al recargar o reabrir se vuelve al menú con lo guardado; una pregunta abierta no se reanuda. |
| R19 | Almacenamiento ilegible, bloqueado, lleno o de una versión posterior del esquema: se avisa, se puede seguir jugando y no se destruye lo guardado. Antes de reparar o migrar se conserva una copia del original; si la copia falla, no se sobrescribe. |
| R20 | PWA instalable que, tras una primera carga completa, recarga y se juega sin conexión. Una versión nueva espera y solo se activa a petición explícita desde el menú; si lo que hay en la página no está guardado, el aviso lo dice antes. La actualización no borra el progreso. |
| R21 | Modo estudio sin evaluación ni puntuación para consultar voicings por Drop, set, calidad e inversión y las rutas II-V-I completas. |
| R22 | En estudio de rutas, mostrar II, V e I y permitir ver el movimiento por cuerda en II → V y V → I, incluida la suma de movimiento absoluto de las cuatro voces. |
| R23 | En modo estudio, transponer las formas a las 12 tonalidades cromáticas desplazando todas sus voces la misma cantidad. Se usa el desplazamiento más corto que no produzca trastes negativos; en una ruta II-V-I se usa un desplazamiento común para conservar la conducción de voces. |
| R24 | Reproducir la variante de sexta de la fuente en estudio, revisión y reconocimiento: la 7ª mayor baja dos trastes y pasa a 6; se rotula Cmaj7 – C6 al revelar la solución, con la séptima gris de referencia. En Difícil se evalúa 6 y se ofrece siempre un banco de ocho grados. El bajo se calcula con la fórmula C6 cuando corresponde. En estudio se transpone junto con la referencia. No se añade una quinta calidad ni se modifican los JSON fuente. |
| R25 | La interfaz debe ser responsive de verdad: en móvil mantiene el flujo vertical y sin desplazamiento horizontal; al verificar muestra el resultado y Siguiente completos si caben, o comienza por el título y permite desplazarse si la corrección es más alta que la pantalla. A partir de escritorio aprovecha el ancho con configuración y contenido en columnas, sin estirar el mástil corto hasta convertirlo en un mástil completo. |
| R26 | Mostrar la versión de la aplicación como una etiqueta pequeña en el menú, los juegos y el modo estudio, obtenida de `package.json`. |
| R27 | Indicar la tónica de referencia antes de responder en reconocimiento. Corregir inversión y grados respecto a ella; tras verificar, localizarla por cuerda y traste y explicar C6/Am7 y Cm7/E♭6 con la inversión de la lectura equivalente. No señalar la posición de la tónica ni adelantar la equivalencia durante la pregunta. |
| R28 | Mostrar «Creado por Jesús Quevedo Rodríguez» en pequeño al pie, después del contenido y sin superponer controles. |
| R29 | En reconocimiento, volver a preguntas anteriores y avanzar conservando respuestas y resultados. Terminar el test en cualquier pregunta y revisar respuestas, errores y solución física, incluidas las preguntas sin verificar. |

## Datos de rutas

Drop 2 sets 1 y 2, mayor y menor; cuatro inversiones iniciales. No ofrecer sets sin rutas normalizadas. Las demás familias sí están disponibles para reconocimiento y para estudio de voicings.

Mayor: Dm7-G7-Cmaj7. Menor: Dm7(b5)-G7-Cm7. La respuesta pertenece a nuestra secuencia, no es la única posibilidad musical.

## Estado

DR-001 a DR-007 están integradas en `main`: juego de reconocimiento, rutas II-V-I, progreso local, PWA, documentación y despliegue en GitHub Pages. DR-008 añade el modo estudio, la visualización del movimiento de voces y la transposición del material de estudio. DR-009 corrige la fidelidad de la variante C6 de la fuente y añade una distribución específica para escritorio sin cambiar el flujo móvil. DR-011 está en desarrollo: navegación y revisión del test de reconocimiento.

Los juegos evaluables permanecen en C en esta entrega. El modo estudio no modifica los contadores de progreso.

## Ampliaciones posteriores

Siguen fuera del alcance actual: audio, metrónomo, repaso adaptativo, sesiones cerradas de preguntas, cuentas, backend, sincronización entre dispositivos, notificaciones, puntuación avanzada, rachas y clasificaciones. También queda como posible ampliación futura llevar la transposición a los juegos evaluables.
