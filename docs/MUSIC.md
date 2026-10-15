# Contrato musical

| ID | Familia | Set | Cuerdas desde la grave |
| --- | --- | --- | --- |
| D2S1 | Drop 2 | 1 | 4-3-2-1 |
| D2S2 | Drop 2 | 2 | 5-4-3-2 |
| D2S3 | Drop 2 | 3 | 6-5-4-3 |
| D3S1 | Drop 3 | 1 | 5-3-2-1 |
| D3S2 | Drop 3 | 2 | 6-4-3-2 |
| D24S1 | Drop 2+4 | 1 | 5-4-2-1 |
| D24S2 | Drop 2+4 | 2 | 6-5-3-2 |

Afinación EADGBE: MIDI al aire 6=40, 5=45, 4=50, 3=55, 2=59, 1=64. En dibujo, 1 arriba y 6 abajo.

| Clave | Nombre | Grados | Semitonos |
| --- | --- | --- | --- |
| maj7 | Cmaj7 | 1,3,5,7 | 0,4,7,11 |
| 7 | C7 | 1,3,5,b7 | 0,4,7,10 |
| m7 | Cm7 | 1,b3,5,b7 | 0,3,7,10 |
| m7b5 | Cm7(b5) | 1,b3,b5,b7 | 0,3,6,10 |
| dim7 | Cdim7 | 1,b3,b5,bb7 | 0,3,6,9 |

112 formas evaluables: siete sets, cuatro calidades y cuatro inversiones. Las doce disminuidas Drop 2 son de referencia. El acorde dim7 es simétrico; no evaluarlo sin fijar raíz y contexto. La fuente rotula °7 y el dato normalizado conserva bb7.

Inversión 0=Fundamental, 1=primera, 2=segunda, 3=tercera. Se comprueba desde el bajo real MIDI, no desde la primera nota de un array. notes sigue el orden de cuerdas del set.

## Rutas

Dieciséis: Drop 2 sets 1 y 2, mayor/menor, cuatro inversiones iniciales.

| II | V | I |
| --- | --- | --- |
| Fundamental | 2ª | Fundamental |
| 1ª | 3ª | 1ª |
| 2ª | Fundamental | 2ª |
| 3ª | 1ª | 3ª |

Mayor Dm7-G7-Cmaj7. Menor Dm7(b5)-G7-Cm7. No sustituir el I menor por Cm(maj7) o Cm6.

Oráculo D2S1 mayor primera inversión (4-3-2-1): Dm7 3,5,3,5; G7 3,4,3,3; Cmaj7 2,4,1,3.
Oráculo D2S2 menor fundamental (5-4-3-2): Dm7(b5) 5,6,5,6; G7 5,5,4,6; Cm7 3,5,3,4.

Comparar con nuestra ruta exacta. En el juego, las cuatro candidatas de una pregunta son el mismo paso de las cuatro rutas del set y modo, y solo una es la de nuestra ruta: las otras son posiciones válidas de la misma calidad que esta ruta no usa, y no se describen como musicalmente incorrectas. No sustituir por un optimizador ni declarar que sea el mínimo universal. Otras soluciones pueden ser musicalmente válidas.

La fuente HTML es autoridad de las posiciones normalizadas. Los PDF son guías de imágenes de Pedro Bellora; sus 42 páginas no se han transcrito íntegramente. Para añadir rutas se exige transcripción, auditoría física y oráculos independientes.

Preguntas de reconocimiento (DR-003 y DR-004): se eligen entre las 16 formas evaluables del set y la inversión esperada sale del bajo físico. El banco de grados de la dificultad difícil es fijo: 1, 3, b3, 5, b5, 7 y b7. Se comparan tal cual con el grado de cada nota: b3 no equivale a 3, ni b5 a 5, ni b7 a 7.

## Variante C6 de la fuente

C6 no es una quinta calidad evaluable. `data/catalog.json` mantiene Cmaj7 y `data/routes.json` conserva `sourceOptionalSubstitution: "C6"` cuando la propia fuente cita esa alternativa.

En modo estudio y en la revisión de tarjetas se reproduce esa lectura sobre una copia derivada: la voz con grado 7 baja dos trastes, pasa a grado 6 y el nombre se muestra como `Cmaj7 – C6`. La séptima original se conserva como círculo gris de referencia, con su etiqueta 7; no es una quinta voz activa ni interviene en el cálculo del movimiento. Al transponer en estudio se desplazan tanto la sexta como esa referencia (`Dmaj7 – D6`, etc.) sin reescribir los JSON ni cambiar los juegos evaluables. La regla de la plantilla original se aplica a los Cmaj7 de 3ª inversión y, en Drop 2+4, también a los de 1ª inversión. En las rutas se respeta exclusivamente donde `sourceOptionalSubstitution` lo indica. La vista neutra de revisión oculta la séptima de referencia y todas las etiquetas.
