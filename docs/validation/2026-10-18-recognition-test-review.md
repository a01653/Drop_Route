# DR-011: navegación y revisión del reconocimiento

## Cambios

El test de reconocimiento guarda por pregunta la respuesta y el resultado. «Anterior» vuelve al intento previo; «Siguiente» restaura los intentos ya visitados. «Terminar y revisar» cierra la sesión actual y muestra los aciertos, errores por campo, solución física y preguntas pendientes. Retroceder o revisar no incrementa los contadores.

## Comprobaciones ejecutadas

- `npm run typecheck`: correcto.
- `npm run lint`: correcto.
- `npm run test:unit`: 345 pruebas correctas.
- `npm run build`: correcto.
- `npm run docs:check` y `npm run docs:check:final`: correctos; DTS y derivados sincronizados.
- `git diff --check`: correcto.

El E2E `reconocimiento: anterior restaura el test y Terminar y revisar lista los errores` está escrito para escritorio y móvil. Playwright generó y sirvió el build, pero no pudo iniciar Chromium: falta `chromium_headless_shell-1248`. Por tanto, el recorrido de navegador sigue pendiente de ejecución en un entorno con el navegador instalado.
