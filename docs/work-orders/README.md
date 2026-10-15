# Órdenes de trabajo

Cada tarea se pide por separado. Las reglas permanentes están en CLAUDE.md y AGENTS.md.

| Orden | Objetivo |
| --- | --- |
| [DR-001](DR-001.md) | Base React/TypeScript/Vite, lint, Vitest y Playwright. |
| [DR-002](DR-002.md) | Tarjetas SVG e icono. |
| [DR-003](DR-003.md) | Reconocimiento fácil y medio. |
| [DR-004](DR-004.md) | Grados difíciles, arrastre y dos toques. |
| [DR-005](DR-005.md) | Rutas II-V-I. |
| [DR-006](DR-006.md) | Progreso local y PWA. |
| [DR-007](DR-007.md) | Cierre, documentación y DTS. |
| [DR-008](DR-008.md) | Modo estudio, movimiento de voces y transposición. |
| [DR-009](DR-009.md) | Variante C6 de la fuente y distribución responsive de escritorio. |

Pedir: «Lee CLAUDE.md y docs/work-orders/DR-009.md. Ejecuta solo DR-009 y entrega para revisión». No avanzar automáticamente a la siguiente tarea. Registrar nuevas decisiones en la documentación del cambio.

## Bloques históricos

Los bloques usados para la primera versión fueron:

| Bloque | Órdenes | Rama |
| --- | --- | --- |
| Reconocimiento | DR-003 y DR-004 | feat/recognition-game |
| Rutas | DR-005 | feat/ii-v-i-game |
| Cierre | DR-006 y DR-007 | feat/progress-and-pwa |

La primera versión quedó integrada en `main`. Las ampliaciones posteriores se abren como una nueva orden y una nueva rama por objetivo. Una aprobación funcional no autoriza por sí sola commit, merge, tag, push o publicación; esas acciones siguen las reglas de AGENTS.md.
