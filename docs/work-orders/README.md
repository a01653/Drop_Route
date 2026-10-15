# Órdenes de trabajo

Cada tarea se pide por separado. Las reglas permanentes están en CLAUDE.md y AGENTS.md.

| Orden | Objetivo | Estado |
| --- | --- | --- |
| [DR-001](DR-001.md) | Base React/TypeScript/Vite, lint, Vitest y Playwright. | Completada e integrada en `main`. |
| [DR-002](DR-002.md) | Tarjetas SVG e icono. | Completada e integrada en `main`. |
| [DR-003](DR-003.md) | Reconocimiento fácil y medio. | Completada e integrada en `main`. |
| [DR-004](DR-004.md) | Grados difíciles, arrastre y dos toques. | Completada e integrada en `main`. |
| [DR-005](DR-005.md) | Rutas II-V-I. | Completada e integrada en `main`. |
| [DR-006](DR-006.md) | Progreso local y PWA. | Completada e integrada en `main`. |
| [DR-007](DR-007.md) | Cierre, documentación y DTS. | Completada e integrada en `main`. |
| [DR-008](DR-008.md) | Modo estudio, movimiento de voces y transposición. | Completada e integrada en `main`. |
| [DR-009](DR-009.md) | Variante C6 de la fuente y distribución responsive de escritorio. | Completada e integrada en `main`, incluidas las correcciones de revisión y séptima gris. |

DR-009 ya está terminada; no es una tarea pendiente. Sus evidencias están en la [validación inicial](../validation/2026-10-15-dr-009-c6-desktop-layout.md) y en la [corrección de C6 y séptima gris](../validation/2026-10-15-dr-009-c6-review.md).

La entrega móvil disponible es la PWA de DR-006, publicada en GitHub Pages. No hay un paquete APK/AAB generado ni publicado en Releases.

Para una ampliación nueva, crear otra orden y pedir su ejecución por separado. No avanzar automáticamente a la siguiente tarea. Registrar nuevas decisiones en la documentación del cambio.

## Bloques históricos

Los bloques usados para la primera versión fueron:

| Bloque | Órdenes | Rama |
| --- | --- | --- |
| Reconocimiento | DR-003 y DR-004 | feat/recognition-game |
| Rutas | DR-005 | feat/ii-v-i-game |
| Cierre | DR-006 y DR-007 | feat/progress-and-pwa |

La primera versión quedó integrada en `main`. Las ampliaciones posteriores se abren como una nueva orden y una nueva rama por objetivo. Una aprobación funcional no autoriza por sí sola commit, merge, tag, push o publicación; esas acciones siguen las reglas de AGENTS.md.
