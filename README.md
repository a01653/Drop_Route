# Drop Route

Juego de estudio de voicings de guitarra y rutas II-V-I para móvil y ordenador.

**Estado:** DR-001 a DR-008 cubren la versión actual: reconocimiento de voicings, rutas II-V-I, progreso local, PWA, documentación, publicación en GitHub Pages y el nuevo modo estudio con movimiento de voces y transposición.

Esta base fue reconstruida el 13/10/2026 después de perder la copia temporal del primer intento. Conserva las decisiones del proyecto y vuelve a extraer las posiciones de las mismas referencias originales; no es una recuperación byte a byte del commit local perdido.

## Contenido

- Instrucciones de desarrollo en [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md).
- [Requisitos](docs/PROJECT.md), [apariencia](docs/VISUAL.md), [contrato musical](docs/MUSIC.md) y [decisiones](docs/DECISIONS.md).
- Plantilla HTML y dos guías PDF originales en [references](references/README.md).
- 112 posiciones evaluables, 12 disminuidas de referencia y 16 rutas completas.
- Aplicación React, TypeScript y Vite en `src/`, separada en datos, música, sesión, progreso e interfaz.
- Reconocimiento de voicings en fácil, medio y difícil, y rutas II-V-I de Drop 2.
- Modo estudio sin examen para consultar voicings y rutas, transponerlos a las 12 tonalidades y ver la conducción de voces.
- Progreso local por dispositivo y PWA con actualización controlada y recarga sin conexión.
- Pruebas con node:test, Vitest y Playwright.
- [DTS principal](docs/DTS.md), [PDF](docs/latex/DTS_Drop_Route.pdf) y LaTeX sincronizados con la primera versión cerrada.
- [Manual de uso](docs/manuals/USO.md) y [manual de instalación](docs/manuals/INSTALACION.md), con sus PDF en `docs/latex/`.
- [Plan de pruebas](docs/TEST_PLAN.md), [órdenes de trabajo](docs/work-orders/README.md) y [registros de validación](docs/validation/).

El 13/10/2026 se autorizó publicar la base completa en `a01653/Drop_Route`, incluidos los tres materiales originales.

## Uso del paquete

Requisitos para desarrollar o probar el proyecto:

- Node.js 22.13 o superior; `.nvmrc` propone Node 24.
- Git.
- Python 3.10 o superior para `data:check` y la generación documental.
- Chromium de Playwright para E2E y capturas: `npx playwright install chromium`.
- Pandoc y LuaLaTeX completo o XeLaTeX para regenerar DTS y manuales.

```bash
npm ci --ignore-scripts
npm run validate
```

Clonar el repositorio:

```bash
git clone https://github.com/a01653/Drop_Route.git
cd Drop_Route
```

## Comandos

```bash
npm run dev          # servidor de desarrollo de Vite
npm run build        # typecheck y build en dist/
npm run preview      # sirve el build existente
npm run typecheck
npm run lint
npm test             # node:test + Vitest
npm run test:unit
npm run test:base
npm run test:e2e     # Playwright sobre un build nuevo
npm run icon:export
npm run audit:music
npm run data:check
npm run docs:build   # DTS y manuales en LaTeX/PDF
npm run docs:check
npm run docs:check:final
```

`npm run build` genera también `dist/sw.js` y empaqueta el manifest y los iconos de la PWA. `npm run test:e2e` crea un build nuevo, lo sirve durante la prueba y detiene el servidor al terminar.

La política de `docs/documentation-policy.json` está en `required`: `docs:check` y `docs:check:final` exigen que el DTS y los manuales coincidan con sus fuentes y capturas registradas.

## Juego

En reconocimiento eliges Drop, set de cuerdas y dificultad. Fácil pide el acorde; medio añade la inversión; difícil añade los cuatro grados sobre la tarjeta mediante arrastre, dos toques, teclado o los controles de colocación sin arrastre.

En rutas II-V-I se usa Drop 2, sets 1 y 2. Puedes practicar II → V, V → I o la secuencia completa, en mayor o menor. La partida permanece visible y eliges una de cuatro posiciones candidatas.

Los juegos evaluables continúan en C en DR-008; sus reglas y contadores no cambian.

## Modo estudio

Desde el menú principal se abre `#/study`. No hay preguntas, verificación ni puntuación.

**Voicings:** eliges Drop, set, calidad e inversión y ves la solución completa. El selector de tonalidad transpone la forma a cualquiera de las 12 tónicas cromáticas sin modificar los datos fuente.

**Rutas II-V-I:** eliges set, mayor o menor y una de las cuatro rutas. Se muestran II, V e I juntos y `Ver movimiento` detalla cuánto se desplaza cada voz en cada cuerda entre II → V y V → I. La suma de movimiento absoluto ayuda a comparar visualmente la conducción.

La transposición usa el desplazamiento cromático más corto que no produzca trastes negativos. Si hace falta se coloca la forma una octava más arriba. En una ruta completa se aplica el mismo desplazamiento a los tres acordes para conservar exactamente los movimientos de voces de la fuente.

La pantalla `#/revision` sigue permitiendo revisar las 112 tarjetas y el icono sin entrar en una partida.

## Progreso y PWA

Cada pregunta verificada suma un intento. En reconocimiento se cuenta por set y dificultad; en rutas, por set, modo y tramo. Solo hay acierto cuando la respuesta completa coincide con la solución del ejercicio. El modo estudio no suma intentos ni aciertos.

La configuración y los contadores se guardan en `localStorage` en el navegador y dispositivo actuales. No hay cuentas ni sincronización. Si el almacenamiento falla, la aplicación lo avisa y permite continuar en memoria.

El build genera un service worker con precaché de los recursos de la aplicación. Una versión nueva queda esperando hasta que el usuario acepta actualizar desde el menú. La actualización no borra el progreso guardado.

## GitHub Pages

El repositorio incluye `.github/workflows/deploy-pages.yml`, siguiendo el esquema de publicación usado en `a01653/mastil_escalas`: un trabajo construye la aplicación y otro despliega el artefacto con GitHub Pages.

Drop Route se construye para la subruta `/Drop_Route/`:

```bash
DROP_ROUTE_BASE=/Drop_Route/ npm run build
```

En PowerShell:

```powershell
$env:DROP_ROUTE_BASE = '/Drop_Route/'
npm run build
```

La aplicación está publicada en:

<https://a01653.github.io/Drop_Route/>

El primer despliegue desde `main` terminó correctamente en la ejecución `38675602253` de GitHub Actions.

## Integración continua

`.github/workflows/validate-foundation.yml` ejecuta dos trabajos. `foundation` valida datos, auditoría musical, tests de base y documentación estricta. `app` ejecuta typecheck, lint, unitarias, build, E2E y genera las capturas de los manuales como artefacto.

DR-008 quedó validada en la ejecución `38695734680`; el resultado está registrado en [docs/validation/2026-10-15-dr-008-study-movement-transposition.md](docs/validation/2026-10-15-dr-008-study-movement-transposition.md).

## Límites actuales

No hay audio, metrónomo, cuentas, backend, sincronización entre dispositivos ni notificaciones. La transposición de DR-008 se limita al modo estudio; los juegos evaluables permanecen en C. Las rutas evaluables y de estudio se limitan a Drop 2, sets 1 y 2. La instalación PWA y el comportamiento en dispositivos físicos, Safari y Firefox no están cubiertos por la batería actual de Chromium.

`FILES_SHA256.json` y `RECOVERY_STATUS.json` son instantáneas históricas de la reconstrucción inicial y no describen el estado actual del repositorio.
