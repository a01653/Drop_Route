# Drop Route

Juego de estudio de voicings de guitarra y rutas II-V-I para móvil y ordenador.

**Estado: en desarrollo. Existe la base técnica de la aplicación (DR-001) y una pantalla de arranque; los juegos y el icono final todavía no están implementados.** Claude Code realizará la interfaz por órdenes de trabajo.

Esta base fue reconstruida el 13/10/2026 después de perder la copia temporal del primer intento. Conserva las decisiones del proyecto y vuelve a extraer las posiciones de las mismas referencias originales; no es una recuperación byte a byte del commit local perdido.

## Contenido

- Instrucciones para Claude en [CLAUDE.md](CLAUDE.md), con reglas comunes en [AGENTS.md](AGENTS.md).
- [Requisitos](docs/PROJECT.md), [apariencia](docs/VISUAL.md), [contrato musical](docs/MUSIC.md) y [decisiones](docs/DECISIONS.md).
- Plantilla HTML y dos guías PDF originales en [references](references/README.md).
- Datos: 112 posiciones evaluables, 12 disminuidas de referencia y 16 rutas completas.
- 44 tests con node:test (24 de la base musical, 11 del utillaje y 9 de la política documental) y auditorías de música y procedencia.
- Aplicación React, TypeScript y Vite en `src/`, con capas de datos, música, sesión e interfaz, y 15 tests Vitest.
- Humo E2E con Playwright sobre el build, en escritorio y móvil.
- [DTS principal](docs/DTS.md), su [PDF](docs/latex/DTS_Drop_Route.pdf) y LaTeX derivado.
- [Plan de pruebas](docs/TEST_PLAN.md) y [siete órdenes de trabajo](docs/work-orders/README.md).

El 13/10/2026 el usuario autorizó publicar esta base completa en a01653/Drop_Route, incluidos los tres materiales originales. El juego y el icono final siguen pendientes de implementación.

## Uso del paquete

Descomprime el ZIP y abre una terminal en la carpeta Drop_Route. Requisitos:

- Node.js 22.13 o superior (.nvmrc propone Node 24), Git y Claude Code instalado/autenticado.
- Python 3.10 o superior para `data:check` y `docs:build`. El lanzador `scripts/run-python.mjs` lo localiza solo: prueba la variable `PYTHON` y después `py -3`, `python` y `python3` en Windows, o `python3` y `python` en Linux y macOS. Si no encuentra una versión válida, muestra qué probó y cómo resolverlo. Con una ruta no estándar, define `PYTHON`, por ejemplo `PYTHON=C:\Python312\python.exe`.
- Chromium de Playwright para los E2E: `npx playwright install chromium`. No lo instala `npm ci`.
- Pandoc y LuaLaTeX completo o XeLaTeX, solo para regenerar el DTS con `docs:build`.

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

Aplicación:

```bash
npm run dev        # servidor de desarrollo de Vite
npm run build      # comprueba tipos y genera dist/
npm run preview    # sirve dist/; ejecuta antes npm run build
npm run typecheck  # tsc sobre la aplicación y las herramientas
npm run lint
npm test           # node:test de la base y Vitest
npm run test:unit  # solo Vitest
npm run test:base  # solo node:test
npm run test:e2e   # Playwright sobre un build recién generado
```

`npm run test:e2e` genera el build, lo sirve con vite preview durante la prueba y lo detiene al terminar. No hace falta iniciar el preview antes y no debe haber otro servidor en el puerto 4173: si lo hay, Playwright falla en lugar de probar una compilación anterior. El humo comprueba además que `dist/` se generó durante esa misma ejecución.

Base de datos y documentación:

```bash
npm run audit:music
npm run data:check # extracción de la plantilla, con Python 3.10 o superior
npm run docs:check
npm run docs:check:final
npm run validate   # data:check, audit:music, npm test y docs:check
npm run docs:build # DTS en LaTeX y PDF; Python, Pandoc y LaTeX
```

docs:build requiere Pandoc y LuaLaTeX completo o XeLaTeX. Genera las versiones LaTeX/PDF desde el Markdown. Está comprobado con Pandoc 3.12.1. Por decisión del usuario se ejecutará en DR-007 junto con los manuales completos, sus capturas y la revisión visual documental; durante DR-001 a DR-006 solo se mantiene el Markdown actualizado.

docs:check conserva las comprobaciones de enlaces e integridad y declara los cambios pendientes de regeneración. docs:check:final exige la sincronización completa de los derivados y se aplica en DR-007. El PDF existente corresponde a la última generación, no necesariamente al Markdown actual. La política explícita está en `docs/documentation-policy.json`.

La pantalla actual solo muestra el nombre y el estado de desarrollo. No hay juegos ni tarjetas todavía.

## Instantáneas históricas

`FILES_SHA256.json` y `RECOVERY_STATUS.json` son instantáneas de la base inicial reconstruida el 13/10/2026, previas a la publicación y a DR-001. No se actualizan: sus hashes, sus 24 tests y su `applicationImplemented: false` describen aquel momento y no los archivos o resultados añadidos por las fases posteriores. Para saber qué hay hoy, consulta Git, este README, el [DTS](docs/DTS.md) y los [registros de validación](docs/validation/2026-10-13-dr-001-app-foundation.md). Ningún script ni test las comprueba.

## Integración continua

El workflow `.github/workflows/validate-foundation.yml` tiene dos trabajos, que no se habían ejecutado en GitHub al preparar el commit de DR-001; su resultado se consulta en la pestaña Actions. El de la base usa Node 24 y Python 3.10, e instala con `npm ci --ignore-scripts` antes de `data:check`, `audit:music`, `test:base` y `docs:check`. El de la aplicación ejecuta `typecheck`, `lint`, `test:unit`, `build`, la descarga de Chromium y `test:e2e`.

## Flujo

Una rama por objetivo. Pruebas dirigidas durante los ajustes; batería completa aplicable al cierre. Actualizar el DTS cuando cambie el diseño material. Commit, merge, tag, push y despliegue requieren una orden que cubra esas acciones, como en Mástil Escalas.
