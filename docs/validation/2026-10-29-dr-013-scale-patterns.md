# Validación DR-013: patrones de escala

Fecha: 2026-10-29  
Rama: `feat/scale-patterns`  
Paquete: 1.1.0. Esquema de progreso: 2.

## Datos

- `data/scales.json`: 20 patrones (mayor, pentatónica mayor, pentatónica menor y menor natural, cinco formas cada una), transcritos en C de los diagramas de onlineguitarbooks.com el 29/10/2026. Cada patrón guarda la URL, el SHA-256 y el tamaño del diagrama del que se leyó.
- La transcripción coincide con la «posición» (traste más grave) que indica cada página en los 20 casos. El dedo y traste de inicio de las cinco formas de la escala mayor coinciden con los descritos por guitarlessons.com.
- `npm run audit:music`: correcto, «124 posiciones (112 evaluables, 12 de referencia), 16 rutas, 20 patrones de escala y referencias íntegras».
- `tests/scale-patterns.test.mjs`: 16 pruebas correctas. Una valida los 20 patrones; tres son oráculos y nueve, mutaciones deliberadas (nota movida un semitono, grado falso, nota omitida, nota repetida, cuerdas invertidas, posición de la fuente, forma CAGED sin su tónica, patrones intercambiados, pentatónica fuera de su escala y caja que no enlaza). Todas las mutaciones se detectan.

## Pruebas dirigidas durante el desarrollo

- Vitest: 31 ficheros y 397 pruebas correctas. Incluye las doce tonalidades de las cuatro escalas, el orden de grave a agudo sin empates, la tarjeta, la sesión de los dos juegos, el conteo, la migración del esquema 1 al 2 y las pantallas.
- Playwright sobre un build nuevo, en escritorio y móvil: `scales.spec.ts`, `progress.spec.ts` y `study.spec.ts`, 54 de 54 correctas.
- Revisión visual con el servidor de desarrollo a 1280 y 390 px: menú, estudio, Medio, Difícil, ordenar y revisión, sin desplazamiento horizontal ni errores de consola. Durante la revisión se corrigieron la alineación de los botones sobre las notas en escritorio y el nombre accesible de las tarjetas de ordenar, que decía los trastes.

## Documentación

- `npm run docs:captures`: 9 de 9 correctas. Hay 19 figuras, seis nuevas: menú de escalas, estudio, patrones en Medio, patrones en Difícil corregido, ordenar y su corrección. Se revisaron las imágenes.
- `npm run docs:build`: DTS generado sin Overfull hbox; manuales de uso e instalación generados.
- Revisión visual de los tres PDF regenerados: DTS (19 páginas), manual de uso (13) y manual de instalación (5). Se corrigieron:
  - la versión de portada y pies de los manuales, escrita a mano en la plantilla como 1.0.1; ahora sale de `package.json`;
  - un pie de figura demasiado largo, que Pandoc partía y dejaba la captura sin maquetar;
  - la portada del DTS, que seguía en la revisión 1.0.2;
  - el clonado del manual de instalación, que apuntaba a la rama histórica `feat/progress-and-pwa`.
- Ya estaba antes de esta entrega y no se ha cambiado: en el apartado «Preguntas y corrección» del PDF del DTS, el símbolo ✗ se imprime como un cuadro.

## Batería final

Ejecutada una vez sobre el estado entregado, el 29/10/2026:

- `npm run validate`: correcto. `data:check` sin cambios en catálogo y rutas; `audit:music` con 124 posiciones, 16 rutas y 20 patrones de escala; node:test 103 de 103; Vitest 31 ficheros y 397 pruebas; `docs:check` correcto.
- `npm run lint`: correcto.
- `npm run build`: correcto, con typecheck.
- `npm run test:e2e`: 240 de 240 correctas en escritorio y móvil (3,9 min).
- `npm run docs:check:final`: correcto; DTS, manuales y capturas sincronizados.
- `git diff --check`: correcto.

La CI de GitHub y el despliegue de Pages se comprueban tras el push y se indican en la entrega.

## Aprobación y publicación

El usuario aprobó el funcionamiento («todo ok») y autorizó commit, fusión y publicación el 29/10/2026.
