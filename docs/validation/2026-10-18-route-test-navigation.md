# Validación: navegación y revisión del test de rutas

Fecha: 18/10/2026  
Rama: `feat/ii-v-i-game`  
Base revisada: `16b6188` (`fix: preserve line boundaries when transferring reviewed files`)

## Cambio

Se guarda cada pregunta de rutas con la candidata elegida y su resultado. «Pregunta anterior» restaura ese estado; «Siguiente» avanza por preguntas ya visitadas y solo crea una nueva al llegar al final. «Terminar test» finaliza la sesión sin imponer un número de preguntas y abre un resumen que muestra, por pregunta, el voicing elegido, el voicing y la candidata de la ruta, si coinciden o si quedó sin verificar, y permite abrir los dos diagramas físicos para compararlos. No se presenta una alternativa válida como error musical ni se añade puntuación global.

## Comprobaciones

- `npm run validate`: correcto. Extracción de `catalog.json` y `routes.json`, auditoría de 124 posiciones y 16 rutas, 51 pruebas base, 172 pruebas Vitest y `docs:check` correcto. La regeneración del DTS queda aplazada a DR-007 según la política vigente.
- `npm run lint`: correcto.
- `npm run build` y comprobación de tipos: correctos.
- `npm run test:e2e`: no validado funcionalmente. Playwright detectó 129 casos; dos comprobaciones del servidor pasaron. Los casos que requieren navegador no arrancaron porque falta Chromium. `npx playwright install chromium` recibió un archivo de 0 MiB que no era un ZIP válido, por lo que no pudo instalarlo.

La revisión visual en escritorio y móvil queda pendiente de ejecutar con Chromium. No se hizo commit, merge ni publicación.
