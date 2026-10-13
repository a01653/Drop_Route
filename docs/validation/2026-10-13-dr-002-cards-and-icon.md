# Validación de DR-002: tarjetas SVG e icono

Fecha 13/10/2026. Rama feat/cards-and-icon. Alcance: renderizador de tarjetas, vista neutra y de solución, pantalla de revisión, icono y sus pruebas; no hay juegos.

Entorno: Windows Server 2019, Node.js 26.3.1, npm 11.17.0, Python 3.13.7, Chromium de Playwright 1.64.0. No se han añadido dependencias. No se ha regenerado el LaTeX ni el PDF del DTS.

## Batería final

Ejecutada una vez sobre el estado definitivo, tras el ajuste de la ventana de Drop 2+4 set 1 (véase más abajo). Los resultados anteriores a ese ajuste (47 tests Vitest, 25 documentos) quedan sustituidos por estos.

| Comando | Resultado |
| --- | --- |
| npm run validate | Correcto. Incluye los cuatro pasos siguientes. |
| data:check y audit:music | Correctos: 124 posiciones (112 evaluables, 12 de referencia), 16 rutas y referencias íntegras. Los datos no tienen cambios. |
| npm test | node:test: 51 correctos, 0 fallos, 0 omitidos (24 musicales, 11 de utillaje, 9 de política documental y 7 del icono). Vitest: 8 ficheros y 50 tests correctos. |
| docs:check | Correcto: 26 documentos. Declara «PENDIENTE DR-007: regenerar DTS por cambios en docs/DTS.md, scripts/build_dts.py». |
| npm run lint | Correcto, sin avisos. |
| npm run typecheck | Correcto, aplicación y herramientas. |
| npm run build | Correcto: 36 módulos. JavaScript 285,71 kB (85,25 kB comprimido), CSS 3,64 kB y las dos fuentes como ficheros (19,90 y 67,46 kB). |
| npm run test:e2e | 27 correctos en 19,8 s y ninguno omitido: 5 de humo y 8 de tarjetas por proyecto, y 1 comparación con la plantilla. |
| npm run docs:check:final | Rechazo esperado, código 1: DTS pendiente de regenerar. Es lo que DR-007 debe dejar en verde. |

No hay advertencias en ninguna salida y no queda ningún servidor escuchando en el puerto 4173.

## Fidelidad con la plantilla

Un E2E abre references/laminas-drop-original.html en Chromium y compara su DOM con el de las tarjetas, en las 112 formas y en las dos vistas (224 comparaciones). No hay diferencias en la posición de ningún círculo, el cejuelo, las marcas ×, la numeración de trastes, el nombre, la familia, el fondo y el borde, y el color y la etiqueta de cada círculo. La posición se mide en unidades de la tarjeta con una tolerancia de 0,06.

Ajuste del 13/10/2026 por orden del usuario: las cuatro tarjetas de Drop 2+4 set 1, 3ª inversión, conservan la ventana original, que empieza en el traste 12 (trastes 12 a 16). Antes empezaban en el 13 porque la plantilla cuenta en la ventana la sexta de la sustitución C6, que no se dibuja. Ahora `groupWindow` cuenta ese traste (la séptima del Cmaj7 menos dos) en los nueve grupos donde la plantilla dibuja C6, sin dibujarla ni añadirla al ejercicio: las notas siguen en los trastes 13, 14 y 15 y la columna del traste 12 queda vacía. Solo cambia la ventana de ese grupo.

El E2E ya no admite excepciones: exige que los números de traste de las 112 tarjetas sean idénticos a los de la plantilla, que las nueve tarjetas con C6 sean exactamente las esperadas, que la sexta esté en la cuerda de la séptima fantasma dos trastes más abajo y que la aplicación no dibuje ningún círculo ahí. Vitest fija la ventana 12/5 de las cuatro tarjetas, sus notas y que ningún otro grupo cambia. Control negativo: con la sexta contada un traste (en vez de dos) fallan las dos pruebas nuevas de Vitest y el E2E (`Drop 2+4 · set 1, tarjeta 4, vista Neutra: ventana`); se revirtió.

También se comparó a simple vista la plantilla renderizada y la pantalla de revisión, y se ampliaron tarjetas a 3× para revisar los bemoles dentro del círculo.

## Geometría y móvil

- Vitest comprueba, en las 112 formas, centrado entre trastes y sobre cuerda, ausencia de recortes y solapes, marcas de cuerdas no tocadas, numeración, cejuelo y ventana común a las cuatro calidades. Las 28 ventanas caben en cinco columnas.
- El E2E mide el DOM renderizado a 360, 390 y 430 px, en vista neutra y de solución, en los siete sets y en los dos proyectos (224 tarjetas por ancho y proyecto): sin desplazamiento horizontal, ninguna tarjeta fuera de la pantalla, círculos de 18 unidades centrados a menos de 0,75 px entre las líneas de traste renderizadas y sobre una línea de cuerda, y ninguno recortado por la tarjeta ni fuera del mástil.
- Los 9 controles de la pantalla de revisión miden al menos 48 por 48 px a 360 px.
- Capturas revisadas a 360, 390, 430 y 1280 px, en neutra y solución.
- Capturas de revisión del ajuste, en la sección siguiente.

## Capturas de revisión

En [capturas-dr-002](capturas-dr-002/), hechas con Chromium sobre el build de esta rama servido con `vite preview` en un puerto aparte (ya detenido), a 360 px de ancho y densidad 2 (el icono, a densidad 1 para ver píxeles reales). No son las capturas de los manuales, que siguen aplazadas a DR-007.

| Captura | Contenido |
| --- | --- |
| [d24s1-3a-inversion-neutra-360.png](capturas-dr-002/d24s1-3a-inversion-neutra-360.png) | Las cuatro posiciones ajustadas, vista neutra. |
| [d24s1-3a-inversion-solucion-360.png](capturas-dr-002/d24s1-3a-inversion-solucion-360.png) | Las mismas, vista de solución. |
| [comparacion-plantilla-d24s1-3a-inversion.png](capturas-dr-002/comparacion-plantilla-d24s1-3a-inversion.png) | Plantilla original (izquierda, con la sexta de C6 y la séptima fantasma) y Drop Route (derecha). |
| [d24s1-neutra-360-16-tarjetas.png](capturas-dr-002/d24s1-neutra-360-16-tarjetas.png) | Las 16 tarjetas de Drop 2+4 set 1, neutra. |
| [d24s1-solucion-360-16-tarjetas.png](capturas-dr-002/d24s1-solucion-360-16-tarjetas.png) | Las mismas, solución. |
| [icono-32-y-128.png](capturas-dr-002/icono-32-y-128.png) | Icono exportado a 32 y 128 px sobre fondo claro y oscuro, y el de 32 ampliado 8× sin suavizar. |
| [icono-pantalla-revision-360.png](capturas-dr-002/icono-pantalla-revision-360.png) | La sección del icono de la pantalla de revisión a 360 px, a tamaño real. |

Para las cuatro tarjetas, las capturas ocultan con CSS las otras doce y las dejan seguidas; no cambia nada más. Para ver el resto de sets, abre `#/revision`.

## Sin pistas en la vista neutra

Comprobado en las 112 formas con Vitest y en los siete sets en el navegador: un único relleno gris para todos los círculos y un único fondo; el texto de la tarjeta son solo números; sin identificadores, atributos de datos, títulos ni descripciones; ningún color musical ni de calidad; el nombre accesible lista solo cuerdas y trastes. Una prueba demuestra que dos formas con las mismas posiciones y distinta calidad, inversión, grados e identificador producen el mismo HTML. La vista neutra recibe un tipo que solo contiene posiciones, de modo que no puede dibujar la solución.

## Icono

- Original editable en assets/icon/drop-route-icon.svg, exportaciones PNG de 16 a 512 px, manifiesto con hashes y favicon copia del original.
- A 32 px, medido sobre los píxeles del PNG exportado, los cuatro colores ocupan al menos 12 píxeles cada uno, contrastan con el fondo al menos 3 a 1 y sus centros están separados al menos 6 píxeles. Revisado también a simple vista a 16, 32 y 64 px ampliados y a tamaño real sobre fondo claro y oscuro.
- Sin texto dibujado, círculos centrados entre trastes y dentro del 80 % central del lienzo.
- Pendiente de aprobación visual del usuario.

## Controles negativos

Cada uno hizo fallar la prueba correspondiente y se revirtió.

- Círculos desplazados 3 px: fallan la prueba unitaria de centrado y el E2E (3,73 px a 360 px).
- Un dígito del color de la séptima cambiado: falla la comparación con la plantilla.
- Círculos del icono encogidos: falla la prueba de legibilidad a 32 px.

## Problemas encontrados y corregidos

- La ventana de la vista neutra se calculaba con la inversión declarada, de modo que la tarjeta dependía de algo más que de las posiciones. Ahora se obtiene de la posición física.
- El test del workflow de la entrega anterior fallaba si el checkout de Windows escribía CRLF en el YAML, como ocurrió tras el fast-forward. Ahora normaliza el final de línea y `.gitattributes` fija LF para `.yml` y `.svg`.
- La comparación con la plantilla se saltaba en el proyecto móvil con `test.skip`, lo que dejaba un test omitido. Ahora ese proyecto no incluye el fichero.

## No comprobado

- Dispositivos reales, Firefox y WebKit: las pruebas móviles usan emulación de Chromium.
- Las fuentes manuscritas solo se han visto en Chromium. Hasta que cargan, el texto usa una fuente de respaldo.
- La CI de GitHub no se ha ejecutado con estos cambios: la rama no está subida.
- El LaTeX y el PDF del DTS no se han regenerado, por el calendario documental; el DTS Markdown está actualizado.
- Las extracciones de la plantilla y de las fuentes usaron un entorno virtual temporal de Python y herramientas fuera del repositorio; ninguna forma parte de la entrega.
