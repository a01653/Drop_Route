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

Pedir: «Lee CLAUDE.md y docs/work-orders/DR-001.md. Ejecuta solo DR-001 y entrega para revisión». No avanzar automáticamente a la siguiente tarea. Registrar nuevas decisiones en docs/DECISIONS.md.

## Bloques

El usuario puede autorizar expresamente, en su petición, un bloque de órdenes consecutivas. Los bloques admitidos son:

| Bloque | Órdenes | Rama |
| --- | --- | --- |
| Reconocimiento | DR-003 y DR-004 | feat/recognition-game |
| Rutas | DR-005 | feat/ii-v-i-game |
| Cierre | DR-006 y DR-007 | la que nombre el usuario; por defecto feat/progress-and-pwa |

Una rama por bloque, pruebas dirigidas entre fases con sus resultados registrados, sin aprobación intermedia salvo contradicción importante o decisión del usuario, batería final una vez sobre el bloque completo y revisión humana al terminar. No se enlaza ningún bloque con el siguiente ni se hace commit, merge o push sin orden expresa. Si el bloque incluye DR-007 rigen sus reglas de cierre documental.

DR-001 a DR-006 mantienen DTS Markdown, README y registros al día y ejecutan las comprobaciones aplicables. LaTeX/PDF, manuales completos, capturas y revisión visual documental se concentran en DR-007. La comprobación documental estricta se exige en ese cierre.
