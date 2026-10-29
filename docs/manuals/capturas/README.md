# Capturas de los manuales

Esta carpeta recibe las capturas reales que usarán los manuales de uso e instalación (DR-007). Las genera `npm run docs:captures`; no se editan a mano. Cada ejecución borra los `*.png` y `capturas.json` anteriores **del destino elegido** y escribe los nuevos; este README se conserva.

## Destino

La variable de entorno `DROP_ROUTE_CAPTURE_OUTPUT` elige el directorio de salida:

- **Sin variable**: se escribe en esta carpeta, `docs/manuals/capturas`. Es la regeneración local intencional de las entradas versionadas que usan los PDF.
- **Con variable** (la CI usa `test-results/manual-captures`): solo se limpia y se escribe ese directorio. Esta carpeta no se toca. Una variable vacía o que apunte a esta carpeta falla sin escribir nada.

La CI no sobrescribe las entradas versionadas porque las preguntas y el commit cambian en cada ejecución. Para actualizarlas hay que ejecutar `npm run docs:captures` sin variable, revisar las imágenes y confirmarlas a propósito.

Son capturas de Chromium sobre el build actual servido por vite preview, jugando por la interfaz. No se simula nada ni se oculta nada con CSS. Se recorta la región pedida (de un elemento a otro) o el viewport; ninguna es una página entera. No hay capturas de controles nativos de instalación del navegador: no se han observado.

## Figuras

| Fichero | Viewport | Qué muestra |
| --- | --- | --- |
| `menu-reconocimiento-1280.png` | ordenador 1280 px | Menú con «Reconocer voicings», sin progreso. |
| `menu-rutas-1280.png` | ordenador 1280 px | Menú con «Rutas II-V-I»: modo y tramo, sin dificultad. |
| `facil-pregunta-1280.png` | ordenador 1280 px | Fácil: tarjeta neutra y cuatro botones de acorde. |
| `facil-correccion-1280.png` | ordenador 1280 px | Fácil con error: elegido en rojo, correcto en verde, colores de la solución. |
| `medio-pregunta-1280.png` | ordenador 1280 px | Medio: los dos desplegables, Acorde e Inversión. |
| `medio-correccion-1280.png` | ordenador 1280 px | Medio con la inversión equivocada: corrección por campos. |
| `dificil-pregunta-1280.png` | ordenador 1280 px | Difícil antes de verificar: banco gris y dos grados colocados. |
| `dificil-correccion-1280.png` | ordenador 1280 px | Difícil con un solo grado equivocado: corrección por campos. |
| `ruta-pregunta-1280.png` | ordenador 1280 px | Ruta abierta: partida, candidata y selector 1 a 4. |
| `ruta-fallo-solucion-1280.png` | ordenador 1280 px | Ruta fallada: selector bloqueado y Solución. |
| `ruta-fallo-tu-respuesta-1280.png` | ordenador 1280 px | La misma ruta con «Tu respuesta». |
| `progreso-detalle-1280.png` | ordenador 1280 px | «Tu progreso» con el detalle de ambos juegos, jugado de verdad. |
| `escritorio-menu-1280.png` | ordenador 1280 px | Vista general del menú con progreso. |
| `menu-escalas-1280.png` | ordenador 1280 px | Menú con «Reconocer patrones»: escala, tonalidad y dificultad. |
| `estudio-escalas-1280.png` | ordenador 1280 px | Estudio de los cinco patrones de una escala, de grave a agudo. |
| `patron-medio-pregunta-1280.png` | ordenador 1280 px | Patrones en Medio: tónicas marcadas sobre la tarjeta neutra. |
| `patron-dificil-correccion-1280.png` | ordenador 1280 px | Patrones en Difícil verificado: corrección por grado y aros sobre tus marcas. |
| `orden-pregunta-1280.png` | ordenador 1280 px | Ordenar: tarjetas sin trastes, dos colocadas. |
| `orden-correccion-1280.png` | ordenador 1280 px | Ordenar verificado con dos puestos intercambiados y el orden correcto. |

Los identificadores y los textos de cada figura viven en `captures/figures.ts`; los manuales citan estos nombres, así que cambiarlos obliga a cambiar los manuales.

## Metadatos

`capturas.json` lista cada figura, en el orden de la tabla, con:

- `file`, `title`, `game` y `state`: fichero, título, juego y estado que debe verse, comprobado por el test antes de capturar.
- `viewport`: tipo, ancho, alto y factor de escala (ordenador 1280×800 a doble densidad).
- `region`: viewport o tramo (selectores de inicio y fin y alto en píxeles CSS).
- `observed`: lo que la propia interfaz declaraba al capturar (fase, título, cabecera y opciones pulsadas del menú).
- `pixels`, `bytes` y `sha256` del fichero.
- `browser` y `commit` (el de la CI cuando existe).

## Estado

Hasta que se ejecute `npm run docs:captures` sin variable y se revisen las imágenes, esta carpeta solo contiene este documento. En la CI, el artefacto `drop-route-manual-captures` contiene los PNG y `capturas.json` de `test-results/manual-captures`, no de esta carpeta.
