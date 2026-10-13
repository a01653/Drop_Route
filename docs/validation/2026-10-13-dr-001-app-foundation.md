# Validación de DR-001: base de la aplicación

Fecha 13/10/2026. Rama chore/app-foundation. Alcance: herramientas, capas, pantalla de arranque y utillaje de Python y CI; no hay juego.

Entorno: Windows Server 2019, Node.js 26.3.1, npm 11.17.0, Python 3.13.7, MiKTeX 26.5 con LuaLaTeX y Pandoc 3.12.1. Chromium de Playwright 1.64.0. Las versiones de las dependencias están en docs/DTS.md y en package-lock.json.

## Batería final

Ejecutada una vez sobre el estado definitivo, tras integrar el calendario documental y sin ningún atajo de `python3` en el PATH.

| Comando | Resultado |
| --- | --- |
| npm run validate | Correcto. Incluye los cuatro pasos siguientes. |
| data:check | Catálogo y rutas coinciden con la plantilla original. Pasa por el lanzador de Python. |
| audit:music | 124 posiciones (112 evaluables, 12 de referencia), 16 rutas y referencias íntegras. |
| npm test | node:test: 44 correctos, 0 fallos, 0 omitidos (24 de la base musical, 11 del utillaje y 9 de la política documental). Vitest: 5 ficheros y 15 tests correctos. |
| docs:check | Correcto: 23 documentos, enlaces, órdenes e integridad de los derivados existentes. Declara «PENDIENTE DR-007: regenerar DTS por cambios en docs/DTS.md, scripts/build_dts.py» sin exigir recompilar. |
| npm run lint | Correcto, sin avisos. |
| npm run typecheck | Correcto, aplicación y herramientas. |
| npm run build | Correcto: 20 módulos. dist/ pesa 0,53 kB de HTML, 1,15 kB de CSS y 262,46 kB de JavaScript (72,32 kB comprimido). |
| npm run test:e2e | 10 correctos en 13,2 s: 5 escenarios por 2 proyectos. |
| npm run docs:check:final | Rechazo esperado, código 1: «DTS pendiente de regenerar» para docs/DTS.md y scripts/build_dts.py. Confirma que el cierre estricto no admite esa excepción y es lo que DR-007 debe dejar en verde. |

Los datos de data/, las referencias, tests/music-catalog.test.mjs, los scripts de auditoría y extracción y las dos instantáneas JSON no tienen cambios. Ninguna salida contiene advertencias. No queda ningún servidor escuchando en el puerto 4173.

## Comprobaciones manuales

No forman parte de la suite.

Lanzador de Python:

- Con Python fuera del PATH, el lanzador sale con código 1 y lista lo probado (py -3, python y python3, además de PYTHON si está definida), con instrucciones de instalación.
- Con PYTHON apuntando a una ruta inexistente falla igual y la lista la incluye. Con PYTHON apuntando a un Python válido y el PATH sin Python, lo usa.
- Propaga el código de salida del script (comprobado con 7) y sin argumentos explica el uso y sale con 2.
- data:check y docs:build funcionan en este Windows sin ningún atajo de python3.
- Los scripts de Python se analizan con la gramática 3.10 y no usan API posteriores; Path.write_text(newline=) existe justo desde 3.10. Solo se ejecutaron con 3.13.7.
- Mutación de los tests del utillaje: quitar el paso de lint del workflow y bajar el mínimo de Python a 3.8 hizo fallar 4 tests. Se revirtió.

Build recién generado en E2E:

- Con el instante de inicio forzado en el futuro, falla el escenario «el preview sirve el build generado en esta ejecución» y pasan los otros cuatro.
- Con un servidor ya escuchando en 4173, Playwright aborta con «already used» y sale con código 1 sin ejecutar ningún test.

Resto de DR-001:

- Humo E2E con fallo deliberado: con el título roto y un recuento sumado en 1, en el proyecto de escritorio fallaron los dos escenarios afectados y pasaron los otros tres.
- Exclusiones de Vitest: con un test que fallaría en .claude/worktrees y otro en tests/, la lista de ficheros de Vitest no los incluyó ni tampoco e2e/smoke.spec.ts. Se borraron.
- Límites entre capas: importaciones prohibidas de data a music, de music a ui y a react, y de session a ui produjeron cuatro errores de ESLint, y la importación permitida de ui a session y music no produjo ninguno. Se borraron los ficheros.
- npm ci --ignore-scripts desde package.json y package-lock.json en un directorio limpio: 179 paquetes, sin vulnerabilidades. El lockfile incluye los binarios nativos de Linux que necesita la CI.
- Revisión visual de la pantalla con capturas de Chromium a 360, 390, 430 y 1280 px: sin recortes ni desbordes.

## Integración del calendario documental

Se integró Drop_Route_Documentation_Final.patch, hecho contra main (72ccefa), sobre los cambios de DR-001. El parche se aplicaba limpio sobre main pero chocaba con DR-001 en AGENTS.md, CLAUDE.md, README.md, DECISIONS.md, DTS.md, TEST_PLAN.md, DR-001.md, package.json y tests/README.md, por lo que se aplicó a mano cada bloque, conservando lo de DR-001 y añadiendo lo del parche. Se copiaron tal cual DR-007.md, el README de órdenes y scripts/check-docs.mjs, que DR-001 no había tocado, y los cuatro ficheros nuevos.

- docs:check y docs:check:final coexisten. package.json conserva todos los scripts de DR-001 y añade docs:check:final.
- AGENTS.md y CLAUDE.md establecen Markdown actualizado por fase y LaTeX, PDF, manuales y capturas en DR-007. DR-001 y DR-007 lo recogen y las órdenes DR-002 a DR-006 no mencionan PDF ni LaTeX, sino que remiten a AGENTS.md.
- No se ejecutó docs:build ni se modificaron el LaTeX, el PDF ni la plantilla.
- El registro 2026-10-13-documentation-policy.md es el del parche, con sus cifras de entonces (33 tests). No se ha modificado.
- Los ficheros copiados se normalizaron a LF.

## Workflow de GitHub

El trabajo de la base usa Node 24 y Python 3.10 (actions/setup-python v7) y ejecuta data:check, audit:music, test:base y docs:check. El de la aplicación ejecuta typecheck, lint, test:unit, build, la descarga de Chromium con dependencias del sistema y test:e2e. Los tests de tests/tooling.test.mjs comprueban que no falta ninguno de esos pasos y su orden. Las versiones de las acciones (checkout 7.0.1, setup-node 7.1.0, setup-python 7.0.0) se consultaron en la API de GitHub. El workflow no se había ejecutado en GitHub al preparar este registro; su resultado remoto se consulta en Actions.

## DTS

El LaTeX y el PDF se generaron durante DR-001 con docs:build mediante el lanzador, con LuaLaTeX: 10 páginas A4 y cero Overfull hbox, con las 10 páginas renderizadas y revisadas. Son la última edición generada. Después, por decisión del usuario, se aplazó la generación a DR-007 y no se han vuelto a generar: el Markdown tiene ahora los párrafos del calendario documental y el generador la ruta del registro normalizada, así que ambos constan como pendientes. Los hashes del LaTeX, el PDF y la plantilla siguen coincidiendo con el registro.

Se corrigieron en el texto, antes de aplazar, rutas largas y nombres de fichero que se partían por palabra, una página final casi vacía y la etiqueta de revisión de la portada y el pie, ahora «base reconstruida y DR-001».

## Cambios de portabilidad necesarios

- scripts/run-python.mjs y scripts/lib/python.mjs localizan Python 3.10 o superior. data:check y docs:build ya no llaman a python3. El registro del DTS anota ahora `npm run docs:build` como comando.
- .gitattributes fija LF para los .tex. En esta copia de Windows el árbol de trabajo tenía CRLF y docs:check fallaba en main por los hashes. Comprobado: sin los CR los hashes coincidían con el registro.
- build_dts.py escribe LaTeX y registro con LF, y llama al compilador con rutas relativas. La ruta temporal corta de Windows contiene una tilde que LaTeX no admite.
- build_dts.py escribe en el registro rutas con barras normales (`as_posix`). Con `str()` escribía `docs\DTS.md` en Windows y en Linux esas rutas no existen, de modo que docs:check habría fallado en la CI. Lo detectó el validador nuevo de la política documental. Las rutas del registro se normalizaron a mano sin regenerar el LaTeX ni el PDF y sin tocar ningún hash.
- build_dts.py reconoce los títulos que Pandoc 3.12 emite sin hypertarget; con la expresión anterior se perdían las 19 guardas Needspace. Tras el cambio hay 19, como en el DTS anterior.
- dts-template.tex define el contador none, que Pandoc 3.12 necesita en tablas sin título. Es inocuo con versiones anteriores.

## Instantáneas históricas

FILES_SHA256.json (hashes de 45 ficheros) y RECOVERY_STATUS.json (estado de la reconstrucción) describen la base inicial del 13/10/2026 y no se han tocado. FILES_SHA256.json incluye el hash de RECOVERY_STATUS.json, así que editar este último rompería su propia instantánea. Se documentan como históricas en el README y en el DTS. Sus hashes, sus 24 tests y applicationImplemented en falso ya no describen el estado actual. Ningún script ni test las comprueba.

## No comprobado

- La CI de GitHub, al preparar este registro: la rama no estaba subida y el workflow no incluye todavía docs:check:final, que se incorporará en DR-007. Ni los trabajos nuevos ni Python 3.10 se habían ejecutado en una máquina real; los pasos se ejecutaron uno a uno en local con Python 3.13.7.
- El lanzador en Linux y macOS: solo con un sistema simulado en los tests, no con un intérprete real distinto del de Windows.
- Firefox, WebKit y un móvil real. El proyecto móvil emula un Pixel 7 en Chromium.
- Pandoc se descargó como zip portable (3.12.1, SHA-256 verificado contra el publicado por GitHub) a una carpeta temporal y no se instaló en el sistema. No hay versión anterior de Pandoc con la que comparar byte a byte el .tex publicado.
