# Corrección del recorte inferior en móvil

Fecha: 15/10/2026. Versión preparada: 1.0.1. Rama: `fix/mobile-result-spacing`, desde `main` en `997911d04efdd665592c25a3709626a087ad5d12`.

## Problema y cambio

La captura del usuario mostraba «Siguiente» cortado por el borde inferior al corregir una pregunta de Fácil. El foco se trasladaba al título del resultado; si el título ya se veía, el navegador podía dejar la parte inferior del bloque fuera de pantalla.

`useGameFocus` mantiene el foco accesible en el título y calcula el desplazamiento con el viewport visual. Si el resultado cabe, lo muestra entero con su margen; si supera la altura disponible, empieza por el título y permite leer el resto desplazándose. Reconocimiento y rutas comparten el mismo comportamiento. La pregunta siguiente vuelve a enfocar su encabezado.

El juego desactiva el anclaje automático del navegador: durante el ajuste se observó que podía interferir con el desplazamiento solicitado al reemplazar el formulario. El margen del resultado y el espacio final del juego incluyen el área de seguridad inferior cuando el navegador la proporciona.

No cambian las tarjetas, la selección por rondas, la música, los contadores ni el esquema guardado. El paquete pasa de 1.0.0 a 1.0.1 una sola vez para esta entrega.

## Evidencia

- Antes del cambio: las cuatro regresiones nuevas de Fácil fallaron en el build original a 400×776 y 360×640, con respuesta correcta e incorrecta.
- Después: 60 ejecuciones E2E dirigidas, todas correctas y sin omitidos, en los proyectos escritorio y móvil. Incluyen los 18 casos nuevos de `mobile-result.spec.ts`, más `recognition.spec.ts` y `responsive.spec.ts`.
- Casos nuevos: Fácil en los dos tamaños; Medio con inversión fallida; rutas con acierto y otra candidata; Difícil a 360×480 con letra de 20 px y corrección más alta que la pantalla; retorno del foco a la pregunta siguiente; escritorio sin desplazamiento innecesario.
- 39 pruebas Vitest de las pantallas de reconocimiento, rutas y aplicación: correctas.
- ESLint de los componentes modificados, el hook y el nuevo E2E: correcto.
- Build y comprobación de tipos: correctos, generados por la ejecución E2E sobre 1.0.1.
- Revisión visual adicional con la misma forma de la captura: Cm7(b5), segunda inversión. A 400×776, el resultado termina en y=760,28 y «Siguiente» en y=743,28; quedan 15,72 px bajo el panel. No hay desbordamiento horizontal ni errores de ejecución. En escritorio 1440×900 también queda completo.
- DTS Markdown actualizado y LaTeX/PDF regenerados con LuaLaTeX: 17 páginas, sin desbordes; revisadas las miniaturas de todas las páginas, la portada y la sección modificada.

Capturas del build revisado:

- [Móvil, 400×776](capturas-mobile-result/facil-correccion-mobile.png).
- [Escritorio, 1440×900](capturas-mobile-result/facil-correccion-desktop.png).

La emulación no reproduce la barra del sistema de un Samsung físico. El área útil de la captura se aproxima con 400×776; no se afirma haber probado el cambio en el teléfono del usuario.

## Estado

Cambio revisado e incluido en la entrega 1.0.1 junto con la sexta en las preguntas. El usuario autorizó publicar ambos ajustes. El [registro conjunto](2026-10-15-recognition-sixth-and-mobile.md) recoge la batería de cierre y los límites de esta entrega.

Se intentó conectar con Claude Code mediante `workspace_info`; el servicio respondió `Internal error -32603`. El desarrollo y las comprobaciones de este ajuste se realizaron con Codex, sin revisión de Claude ni otros subagentes.
