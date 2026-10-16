# Cierre 1.0.1: sexta en preguntas y resultado completo en móvil

Fecha: 15/10/2026. Base: `997911d04efdd665592c25a3709626a087ad5d12`. El usuario autorizó corregir la sexta en reconocimiento y publicar ambos ajustes en la misma entrega. Se conserva la versión 1.0.1 ya preparada para el arreglo móvil.

## Comportamiento

Las nueve variantes C6 de la fuente se derivan mediante una función musical compartida por estudio y reconocimiento: siete terceras inversiones mayores y las dos primeras inversiones de Drop 2+4. La séptima baja dos trastes y se convierte en una sexta activa. La pregunta neutra solo enseña cuatro posiciones; la solución muestra la sexta dorada y la séptima gris de referencia, sin contar esta última como voz activa.

La opción mayor se presenta siempre como «Cmaj7 / C6», incluso cuando la pregunta es de otra familia, para no revelar la variante por sus opciones. No se afirma que los dos acordes tengan las mismas notas. La clave interna sigue siendo `maj7`. En Difícil el banco ofrece siempre ocho grados, incluidos 6 y 7; se evalúa el 6 dibujado y se rechaza 7 en su lugar. El bajo de C6 se calcula con 0,4,7,9, también con las notas desordenadas o la inversión mal rotulada.

`useGameFocus` muestra la corrección y «Siguiente» completos cuando caben; una corrección más alta que la pantalla comienza por el título y se puede recorrer verticalmente. Se preserva el foco accesible y el anclaje automático del navegador no deshace el desplazamiento solicitado.

Los JSON, las referencias originales, la rotación por rondas, las claves de los contadores y el esquema de progreso permanecen intactos. El juego de rutas conserva sus pasos canónicos; las variantes opcionales de esas rutas se consultan en estudio.

## Validación

- Antes del arreglo C6: diez regresiones nuevas fallaron sobre la implementación anterior. Cubren las nueve formas y la ausencia del 6 en el banco.
- Desarrollo: 129 pruebas unitarias dirigidas y 96 ejecuciones E2E dirigidas correctas.
- Cierre: 329 pruebas Vitest en 25 archivos y 87 pruebas de base correctas, sin omitidos.
- E2E completos: 212 casos descubiertos; orden final con salida 0 y `test-results/e2e-final-101/.last-run.json` en `passed`, sin pruebas fallidas. El log local redirigido quedó parcial, sin resumen final; el estado final del ejecutor y su código de salida sí se verificaron.
- La primera ejecución completa detectó dos expectativas antiguas que contaban cuatro etiquetas sin distinguir la séptima de referencia. Ahora se exigen cuatro grados activos y una referencia solo cuando existe sexta. Otra ejecución tuvo dos errores de archivos de trazas al compartir la carpeta de salida con las capturas. La ejecución final usa una carpeta propia y termina correctamente.
- ESLint, tipos y build correctos. Los E2E generan y sirven el build actual, sin reutilizar un preview anterior.
- `data:check`: ambos JSON coinciden con la extracción original. `audit:music`: 124 posiciones, 112 evaluables y 12 de referencia, 16 rutas y referencias íntegras.
- Capturas de manual: ocho escenarios correctos y trece imágenes generadas. Se verificaron sus hashes antes de copiarlas junto con el manifiesto. La primera copia presentaba una imagen distinta de su hash; se regeneró el conjunto completo en un destino temporal y se volvió a verificar.
- DTS y ambos manuales regenerados con LuaLaTeX; sin desbordes. Revisión visual de todas las páginas: DTS 17, uso 15 e instalación 4. Revisados en detalle el apartado C6, la portada y la explicación de la opción conjunta.
- Política documental final correcta, con fuentes, capturas y derivados sincronizados; `git diff --check` correcto.

Revisión visual adicional del build 1.0.1 en Chromium a 400×776 y 1440×900: C6 en tercera inversión, bajo 6, una séptima gris, cuatro notas activas, sin desplazamiento horizontal ni errores de ejecución. En móvil quedan 15,72 px bajo el panel del resultado y «Siguiente» termina en y=743,28.

- [Pregunta C6 neutra en móvil](capturas-source-sixth/c6-pregunta-mobile.png).
- [Solución C6 en móvil](capturas-source-sixth/c6-correccion-mobile.png).
- [Pregunta en escritorio](capturas-source-sixth/c6-pregunta-desktop.png).
- [Solución en escritorio](capturas-source-sixth/c6-correccion-desktop.png).
- [Evidencia del recorte móvil](2026-10-15-mobile-result.md).

Estas comprobaciones usan Chromium y emulación móvil. No constituyen una prueba en un Samsung físico.

## Publicación

Al cerrar este registro, la entrega está validada y autorizada para integrar en `main`, etiquetar como `v1.0.1` y desplegar en GitHub Pages. Los identificadores de commits, etiqueta y ejecuciones remotas quedan en GitHub. La comprobación posterior al despliegue debe verificar la etiqueta visible, C6 con su referencia y la conservación del progreso al actualizar desde 1.0.0.

Claude Code se intentó mediante `workspace_info` y respondió `Internal error -32603`. El cambio y su validación se realizaron con Codex, sin revisión de Claude ni otros subagentes.
