# Drop Route

Juego de estudio de voicings de guitarra y rutas II-V-I para móvil y ordenador.

**Estado: en desarrollo. Integrados en main están la base técnica de la aplicación (DR-001), las tarjetas SVG, el icono aprobado y su pantalla de revisión (DR-002), el juego de reconocimiento de voicings en sus tres dificultades (DR-003 y DR-004) y el juego de rutas II-V-I de Drop 2 (DR-005). En la rama feat/progress-and-pwa, pendiente de revisión y sin integrar, están el progreso local y la PWA (DR-006); falta el cierre documental (DR-007).** Claude Code realiza la interfaz por órdenes de trabajo.

Esta base fue reconstruida el 13/10/2026 después de perder la copia temporal del primer intento. Conserva las decisiones del proyecto y vuelve a extraer las posiciones de las mismas referencias originales; no es una recuperación byte a byte del commit local perdido.

## Contenido

- Instrucciones para Claude en [CLAUDE.md](CLAUDE.md), con reglas comunes en [AGENTS.md](AGENTS.md).
- [Requisitos](docs/PROJECT.md), [apariencia](docs/VISUAL.md), [contrato musical](docs/MUSIC.md) y [decisiones](docs/DECISIONS.md).
- Plantilla HTML y dos guías PDF originales en [references](references/README.md).
- Datos: 112 posiciones evaluables, 12 disminuidas de referencia y 16 rutas completas.
- Tests con node:test (base musical, utillaje, política documental, icono, generador del service worker y build de la PWA) y auditorías de música y procedencia.
- Aplicación React, TypeScript y Vite en `src/`, con capas de datos, música, sesión, progreso e interfaz, y tests Vitest junto a cada capa.
- Tarjetas SVG de las 112 formas, en vista neutra y de solución, con la apariencia de la plantilla ([cómo y qué difiere](docs/VISUAL.md)).
- Icono aprobado: [original SVG editable, variante maskable y exportaciones](assets/icon/README.md).
- Progreso local por dispositivo y PWA instalable con recarga sin conexión (DR-006): véase «Progreso y PWA».
- Pruebas E2E con Playwright sobre el build: humo, tarjetas a 360, 390 y 430 px, comparación con la plantilla original, el juego de reconocimiento (fácil, medio y difícil con arrastre, dos toques y teclado), el de rutas II-V-I, el progreso, el modo sin conexión y la actualización de la PWA.

Las cifras de tests de cada fase están en sus [registros de validación](docs/validation/); aquí no se copian para que no queden desfasadas. `npm test` da el recuento actual de node:test y Vitest.
- [DTS principal](docs/DTS.md), su [PDF](docs/latex/DTS_Drop_Route.pdf) y LaTeX derivado.
- [Plan de pruebas](docs/TEST_PLAN.md) y [siete órdenes de trabajo](docs/work-orders/README.md).

El 13/10/2026 el usuario autorizó publicar esta base completa en a01653/Drop_Route, incluidos los tres materiales originales. No hay despliegue de la aplicación configurado: el alojamiento sigue pendiente de decisión.

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
npm run icon:export # regenera los PNG del icono desde su SVG (necesita Chromium)
```

`npm run build` genera además `dist/sw.js` (el service worker, con la lista de recursos y la versión de ese build) y empaqueta el manifest y los iconos de la PWA. Los iconos finales están versionados en `public/icons/`, así que el build no necesita Chromium. Para publicar bajo una subruta, véase «Progreso y PWA».

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

Con `npm run dev` o `npm run preview`, la raíz es el menú: eliges Drop, set (con sus cuerdas) y dificultad y empiezas a reconocer voicings. Fácil usa cuatro botones de acorde, medio añade la inversión con dos desplegables y difícil añade colocar los grados sobre los cuatro círculos, por arrastre, dos toques, teclado o con los botones compactos «Colocar sin arrastrar». `#/revision` abre la pantalla de revisión: las 112 tarjetas por set, en vista neutra o de solución, y el icono a tamaño real. En el menú, «Rutas II-V-I» pide Drop 2 (sets 1 y 2, los únicos con rutas), modo mayor o menor y tramo (II → V, V → I o los dos seguidos): ves la partida, una sola candidata cada vez con el selector 1 a 4 (o deslizando la tarjeta), verificas y comparas Tu respuesta con la Solución de una en una.

## Progreso y PWA

**Progreso local.** Cada pregunta verificada suma un intento al contador de lo que se estaba practicando: en reconocimiento, set y dificultad; en rutas, set, modo y tramo (el tramo «II → V → I» suma cada mitad en su contador). Es acierto solo si todo lo que pide el nivel es correcto o, en rutas, si se elige la candidata de nuestra ruta. Seleccionar, cambiar de vista, ver la corrección, Siguiente y Salir no cuentan. Se guardan también la configuración del menú y los contadores en `localStorage`, en este dispositivo y navegador, sin cuentas ni sincronización. Al recargar o reabrir la página siempre se vuelve al menú: una pregunta abierta no se reanuda. El panel «Tu progreso» del menú muestra totales por juego, lo de la configuración elegida y el detalle plegado, sin puntos ni rachas.

El esquema guardado tiene su propio número de versión (ahora el 1), independiente del 0.0.0 del paquete. El esquema 0 de `src/progress/fixtures/` es un documento de prueba para ejercitar la cadena de migración, no una versión pública anterior. Antes de reparar o migrar se guarda una copia del original; si la copia falla, el original no se reescribe y esa sesión juega solo en memoria. Un documento de una versión posterior del esquema se conserva intacto y no se sobrescribe. Con almacenamiento bloqueado, lleno o dañado se avisa y se puede seguir jugando. Cada caso, con su clave, está en el [DTS](docs/DTS.md).

**PWA.** El build genera un service worker que precachea solo los recursos propios del build (no las referencias, los PDF ni los mapas de código). La caché se llama `drop-route-precache:<ámbito>:<versión>`: la versión sale del contenido de los recursos y del texto de la plantilla del worker, y el ámbito es la ruta de la base. Una versión nueva se descarga y espera; no se activa sola. Si estás en el menú, la aplicación te ofrece «Actualizar ahora», que activa la nueva y recarga una vez; con una pregunta abierta no se ofrece. Si lo que hay en la página no está guardado en el dispositivo (almacenamiento bloqueado o lleno, o una sesión que no escribe para no pisar un dato anterior), el aviso lo dice antes de que actualices. La actualización no borra el progreso: el worker no toca `localStorage`. El service worker solo se registra en el build (también con `npm run preview`), no con `npm run dev`.

**Publicar bajo una subruta.** Sin configuración, la aplicación cuelga de la raíz del servidor. Para `/Drop_Route/` fija `DROP_ROUTE_BASE` al construir:

```bash
DROP_ROUTE_BASE=/Drop_Route/ npm run build       # bash
$env:DROP_ROUTE_BASE = '/Drop_Route/'; npm run build   # PowerShell
```

Usa la forma `/Drop_Route/`, con barra inicial y final. `normalizeBase` también acepta `Drop_Route` y `/Drop_Route` y los convierte a `/Drop_Route/`. Rechaza con un mensaje claro, haciendo fallar el build, las URLs y las rutas inseguras, como `./`, `../`, espacios o barras dobles (algunos shells de Windows convierten las rutas que empiezan por `/`: si te pasa, usa PowerShell). Sirve el contenido de `dist/` en esa subruta, por HTTPS o desde `localhost`, que es lo que exigen los service workers. El manifest usa rutas relativas y el ámbito del worker es la base, de modo que otra instalación en el mismo origen no comparte ni borra sus cachés. Este repositorio no incluye todavía ningún flujo de despliegue ni ha elegido alojamiento.

**Fuera de alcance.** Cuentas, backend, sincronización entre dispositivos, notificaciones, exportar o recuperar las copias de seguridad desde la interfaz, estudio, repaso adaptativo, audio y transposición. La versión del paquete sigue en 0.0.0.

## Instantáneas históricas

`FILES_SHA256.json` y `RECOVERY_STATUS.json` son instantáneas de la base inicial reconstruida el 13/10/2026, previas a la publicación y a DR-001. No se actualizan: sus hashes, sus 24 tests y su `applicationImplemented: false` describen aquel momento y no los archivos o resultados añadidos por las fases posteriores. Para saber qué hay hoy, consulta Git, este README, el [DTS](docs/DTS.md) y los [registros de validación](docs/validation/2026-10-13-dr-001-app-foundation.md). Ningún script ni test las comprueba.

## Integración continua

El workflow `.github/workflows/validate-foundation.yml` tiene dos trabajos y se ejecuta en GitHub Actions; el resultado de cada entrega está en su [registro de validación](docs/validation/). Con DR-006 todavía no hay una ejecución registrada. El de la base usa Node 24 y Python 3.10, e instala con `npm ci --ignore-scripts` antes de `data:check`, `audit:music`, `test:base` y `docs:check`. El de la aplicación ejecuta `typecheck`, `lint`, `test:unit`, `build`, la descarga de Chromium y `test:e2e`.

## Flujo

Una rama por objetivo. Pruebas dirigidas durante los ajustes; batería completa aplicable al cierre. Actualizar el DTS cuando cambie el diseño material. Commit, merge, tag, push y despliegue requieren una orden que cubra esas acciones, como en Mástil Escalas.
