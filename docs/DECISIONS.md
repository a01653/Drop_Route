# Decisiones

## Confirmadas

Drop Route, repositorio a01653/Drop_Route, desarrollo de interfaz por Claude Code en terminal, primera etapa en C, tarjetas cortas de nuestra plantilla, gris antes de verificar y colores después, tres dificultades, arrastre y dos toques, rutas mediante formas dibujadas una candidata visible cada vez, documentación/tests/DTS como Mástil.

## Base técnica propuesta para DR-001

React, TypeScript, Vite y SVG. Vitest, ESLint y Playwright. Aplicación cliente sin backend. Elegir versiones compatibles y fijarlas en lockfile al ejecutar la tarea, sin copiar dependencias innecesarias de Mástil.

La preparación usa node:test para validar datos sin dependencias externas; no sustituye la futura suite de interfaz.

## Aplicado en DR-001 (pendiente de revisión)

Son decisiones de implementación tomadas al ejecutar la orden, no confirmadas todavía por el usuario.

- Versiones y compatibilidad en `docs/DTS.md`. TypeScript se queda en la serie 6.0 porque typescript-eslint no admite la 7. El mínimo de Node pasa a 22.13 por las herramientas.
- Los tests de la base se conservan con node:test y no se migran a Vitest. `npm test` ejecuta ambos y Vitest excluye `tests/`, `e2e/` y los worktrees.
- Capas `src/data`, `src/music`, `src/session` y `src/ui`, con dependencias en un solo sentido que ESLint hace cumplir. Los JSON de `data/` se importan sin copiarlos.
- Playwright genera el build y lanza vite preview durante la prueba y lo detiene al acabar. No se inicia ningún preview fuera de los E2E.
- La versión del paquete sigue en 0.0.0, porque aún no hay un juego que entregar.
- Python se localiza con un lanzador portable (`scripts/run-python.mjs`), no con `python3` directo, para que `data:check` y `docs:build` funcionen en Windows. Exige 3.10 o superior y la CI usa 3.10.
- El workflow ejecuta cada comprobación como un paso separado en lugar de `npm run validate`, para que cada fallo se vea por su nombre. `validate` sigue siendo el agregado local.
- `FILES_SHA256.json` y `RECOVERY_STATUS.json` se mantienen como instantáneas históricas de la base inicial. No se editan y no se presentan como estado actual.
- Para poder regenerar el DTS: `.gitattributes` fija LF para `.tex`, y el script y la plantilla admiten Pandoc 3.12.1 y las rutas temporales cortas de Windows.

## Pendiente

Icono final; puntuación detallada; estudio, repaso y audio; transposición; C6/dim7 evaluables; hosting y licencia del código nuevo. Las referencias conservan su autoría.

El 13/10/2026 el usuario autorizó la publicación de la base completa en el repositorio público, incluyendo la plantilla HTML y las dos guías originales. Esta orden cubre la entrega inicial, no implementaciones o publicaciones futuras.

## Calendario documental, 13/10/2026

Por decisión del usuario, DR-001 a DR-006 actualizan DTS Markdown, README, instrucciones y evidencia de validación. La generación de LaTeX/PDF, los manuales completos, las capturas y la revisión visual documental se aplazan a DR-007 para reducir el tiempo de cada fase. Los tests y las auditorías no se aplazan.

docs:check sigue verificando la documentación y la integridad de los derivados conservados, y declara las fuentes pendientes de regenerar. docs:check:final exige sincronización completa aunque la política siga en modo deferred. DR-007 cambia la política a required y mantiene ese control en la CI de cierre.
