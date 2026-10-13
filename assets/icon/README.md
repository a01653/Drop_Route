# Icono de Drop Route

Creado en DR-002 según el brief de [docs/VISUAL.md](../../docs/VISUAL.md). Pendiente de aprobación visual del usuario.

## Original editable

`drop-route-icon.svg` es el original. Lienzo cuadrado de 512, fondo azul oscuro `#0B1D2E` a sangre, un fragmento de mástil de cuatro cuerdas y cuatro trastes con cejuelo, y cuatro círculos de raíz, tercera, quinta y séptima (`#E11D48`, `#0284C7`, `#059669`, `#EDBC07`, los de las tarjetas) unidos por una línea de ruta. No tiene letras ni números. Cada círculo está centrado entre dos trastes y sobre una cuerda, como en las tarjetas.

Se edita a mano. Los identificadores de cada grupo (`mastil`, `cuerdas`, `trastes`, `ruta`, `circulos`) describen sus partes. Todo el dibujo cabe en el 80 % central del lienzo, de modo que DR-006 pueda derivar la variante maskable sin rehacerlo.

## Exportaciones

| Fichero | Contenido |
| --- | --- |
| `exports/icon-16.png` a `exports/icon-512.png` | PNG de 16, 32, 48, 64, 128, 256 y 512 píxeles. |
| `exports.json` | Hash del original y de cada exportación. |
| `../../public/favicon.svg` | Copia idéntica del original que usa `index.html` como favicon. |

Para regenerarlo tras editar el SVG, ejecuta `npm run icon:export`. Necesita el Chromium de Playwright (`npx playwright install chromium`) y actualiza `exports.json` y el favicon. Los tests comprueban que los hashes coinciden y que el favicon es copia del original.

## Legibilidad a 32 píxeles

Un test decodifica `exports/icon-32.png` y comprueba que los cuatro colores ocupan al menos 12 píxeles cada uno, que contrastan con el fondo al menos 3 a 1 y que sus centros están separados al menos 6 píxeles. La pantalla de revisión (`#/revision`) enseña las exportaciones a tamaño real sobre fondo claro y oscuro.

## Pendiente

Los tamaños de la PWA y la variante maskable llegan en DR-006. El icono sigue pendiente de aprobación: si se rechaza, basta con rehacer el SVG y ejecutar `npm run icon:export`.
