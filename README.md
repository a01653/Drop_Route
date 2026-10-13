# Drop Route

Juego de estudio de voicings de guitarra y rutas II-V-I para móvil y ordenador.

**Estado: preparación del desarrollo. El juego y el icono final todavía no están implementados.** Claude Code realizará la interfaz por órdenes de trabajo.

Esta base fue reconstruida el 13/10/2026 después de perder la copia temporal del primer intento. Conserva las decisiones del proyecto y vuelve a extraer las posiciones de las mismas referencias originales; no es una recuperación byte a byte del commit local perdido.

## Contenido

- Instrucciones para Claude en [CLAUDE.md](CLAUDE.md), con reglas comunes en [AGENTS.md](AGENTS.md).
- [Requisitos](docs/PROJECT.md), [apariencia](docs/VISUAL.md), [contrato musical](docs/MUSIC.md) y [decisiones](docs/DECISIONS.md).
- Plantilla HTML y dos guías PDF originales en [references](references/README.md).
- Datos: 112 posiciones evaluables, 12 disminuidas de referencia y 16 rutas completas.
- 24 tests de la base y auditorías de música y procedencia.
- [DTS principal](docs/DTS.md), su [PDF](docs/latex/DTS_Drop_Route.pdf) y LaTeX derivado.
- [Plan de pruebas](docs/TEST_PLAN.md) y [siete órdenes de trabajo](docs/work-orders/README.md).

El 13/10/2026 el usuario autorizó publicar esta base completa en a01653/Drop_Route, incluidos los tres materiales originales. El juego y el icono final siguen pendientes de implementación.

## Uso del paquete

Descomprime el ZIP y abre una terminal en la carpeta Drop_Route. Requisitos: Node.js 22 o superior, Python 3.10 o superior, Git y Claude Code instalado/autenticado. .nvmrc propone Node 24.

```bash
npm ci --ignore-scripts
npm run validate
claude
```

Instrucción inicial para Claude:

> Lee CLAUDE.md y docs/work-orders/DR-001.md. Ejecuta solo DR-001, conserva las referencias y los datos musicales y entrega el resultado para revisión. No avances a DR-002.

Obtener la base desde el repositorio:

```bash
git clone https://github.com/a01653/Drop_Route.git
cd Drop_Route
```

## Comandos actuales

```bash
npm test
npm run audit:music
npm run data:check
npm run docs:check
npm run validate
npm run docs:build
```

docs:build requiere Pandoc y LuaLaTeX completo o XeLaTeX. Genera las versiones LaTeX/PDF desde el Markdown.

Los comandos de Vite, ESLint, Vitest y Playwright se incorporarán en DR-001. No hay src, build web, interfaz jugable o E2E ejecutables en esta base.

## Flujo

Una rama por objetivo. Pruebas dirigidas durante los ajustes; batería completa aplicable al cierre. Actualizar el DTS cuando cambie el diseño material. Commit, merge, tag, push y despliegue requieren una orden que cubra esas acciones, como en Mástil Escalas.
