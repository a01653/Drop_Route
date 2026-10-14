# Icono de Drop Route

Creado en DR-002 según el brief de [docs/VISUAL.md](../../docs/VISUAL.md). Aprobado por el usuario: el original y sus siete PNG de 16 a 512 px, y el favicon, no han cambiado en DR-006.

## Original editable

`drop-route-icon.svg` es el original. Lienzo cuadrado de 512, fondo azul oscuro `#0B1D2E` a sangre, un fragmento de mástil de cuatro cuerdas y cuatro trastes con cejuelo, y cuatro círculos de raíz, tercera, quinta y séptima (`#E11D48`, `#0284C7`, `#059669`, `#EDBC07`, los de las tarjetas) unidos por una línea de ruta. No tiene letras ni números. Cada círculo está centrado entre dos trastes y sobre una cuerda, como en las tarjetas.

Se edita a mano. Los identificadores de cada grupo (`mastil`, `cuerdas`, `trastes`, `ruta`, `circulos`) describen sus partes. Todo el dibujo cabe en el 80 % central del lienzo, de modo que la variante maskable de la PWA se derivó sin rehacerlo.

`drop-route-icon-maskable.svg` es esa variante (DR-006): el mismo dibujo del icono aprobado reducido al 80 % y centrado sobre un fondo opaco `#0B1D2E` a sangre, de modo que todo el dibujo cae dentro del círculo central de radio el 40 % del lienzo que los sistemas operativos nunca recortan. Es un derivado: si cambia el original, se rehace.

## Exportaciones

| Fichero | Contenido |
| --- | --- |
| `exports/icon-16.png` a `exports/icon-512.png` | PNG de 16, 32, 48, 64, 128, 256 y 512 píxeles del icono aprobado. |
| `exports/icon-192.png` y `exports/icon-maskable-512.png` | Añadidos en DR-006 para la PWA: el 192 «any» y el 512 maskable. |
| `exports.json` | Hash del original, de cada exportación y de las de la PWA. |
| `../../public/favicon.svg` | Copia idéntica del original que usa `index.html` como favicon. |
| `../../public/icons/` | Copias que empaqueta el build y que enlaza el manifest: `icon-192.png`, `icon-512.png` (el 512 aprobado, sin cambios) y `maskable-512.png`. |

El PNG de 192 y el maskable de 512 de esta entrega los generó el supervisor con CairoSVG 2.9.1 a partir de los SVG, en su copia de revisión, y no con el Chromium de `npm run icon:export`. El 512 «any» es el `icon-512.png` aprobado. Los hashes de `exports.json` son los de los ficheros versionados. Regenerar con Chromium puede dar bytes distintos con el mismo dibujo; en ese caso `exports.json` y `public/icons/` se actualizan juntos.

Para regenerarlo tras editar el SVG, ejecuta `npm run icon:export`. Necesita el Chromium de Playwright (`npx playwright install chromium`) y actualiza `exports.json`, el favicon y `public/icons/`. Con `npm run icon:export -- --solo-pwa` solo se rehacen el 192 y el maskable y no se tocan los PNG aprobados. Los tests comprueban que los hashes coinciden, que el favicon es copia del original, que `public/icons/` es copia idéntica de las exportaciones y que el maskable es opaco y deja fuera del círculo central solo el fondo. El build no necesita Chromium: usa los ficheros de `public/icons/`.

## Legibilidad a 32 píxeles

Un test decodifica `exports/icon-32.png` y comprueba que los cuatro colores ocupan al menos 12 píxeles cada uno, que contrastan con el fondo al menos 3 a 1 y que sus centros están separados al menos 6 píxeles. La pantalla de revisión (`#/revision`) enseña las exportaciones a tamaño real sobre fondo claro y oscuro.

## Pendiente

Nada del icono. Si en el futuro se cambia el dibujo, hay que rehacer el SVG y la variante maskable y ejecutar `npm run icon:export`.
