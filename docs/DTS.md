# Documento de Diseño Técnico del Software - Drop Route

Repositorio: a01653/Drop_Route. Revisión: base reconstruida el 13/10/2026.
Paquete: 0.0.0. Autor del proyecto: Jesús Quevedo Rodríguez.

Este DTS distingue preparación ejecutada y diseño previsto. Los datos, scripts, tests y documentos existen; el juego y sus pantallas todavía no. La primera base quedó sin publicar y su copia temporal se perdió. La reconstrucción vuelve a validar los datos desde las referencias originales.

## Objetivo y alcance

Drop Route servirá para memorizar voicings, inversiones y grados y practicar rutas II-V-I concretas. Ordenador y móvil. Primera etapa en C, con la apariencia de nuestras tarjetas.

Se preparan fuentes e instrucciones para que Claude Code implemente cada etapa mediante órdenes de trabajo. No necesita acceder al historial de esta conversación ni recibir las plantillas de nuevo.

## Arquitectura general

Diseño previsto de aplicación cliente, sin backend.

| Capa | Responsabilidad prevista |
| --- | --- |
| Datos | Posiciones y rutas procedentes de la plantilla. |
| Núcleo musical | Alturas físicas, grados, inversiones y solución de ruta. |
| Sesión | Pregunta, selección, evaluación y transición. |
| Presentación | Tarjeta SVG, selectores, fichas y resultados. |
| Persistencia | Configuración y progreso local con versión de esquema. |

La geometría no decide la respuesta y los componentes no duplican el catálogo. Actualmente están implementados la extracción y el núcleo de auditoría de esta base, no el motor del juego.

## Tecnologías y dependencias

Node.js 22 o superior ejecuta tests y auditorías. Python 3.10 o superior extrae las constantes literales. La base no necesita dependencias npm externas.

DR-001 propone React, TypeScript y Vite; ESLint, Vitest y Playwright. Elegir y fijar versiones compatibles al ejecutar esa tarea. No copiar dependencias innecesarias de Mástil.

Pandoc y LuaLaTeX completo o XeLaTeX generan este documento. El estilo utiliza la paleta azul oscuro y familias tipográficas de la documentación de Mástil, con equivalentes si faltan TeX Gyre. Idioma español y sin partición de palabras al final de línea.

## Estructura actual

| Ruta | Contenido |
| --- | --- |
| `CLAUDE.md` / `AGENTS.md` | Reglas permanentes y flujo de trabajo. |
| `data/catalog.json` | Sets, fórmulas, afinación y 124 formas. |
| `data/routes.json` | Dieciséis rutas II-V-I completas. |
| references/ | Tres fuentes originales y sus hashes. |
| scripts/ | Extracción, auditoría y generación documental. |
| tests/ | Pruebas ejecutables de la base. |
| e2e/ | Nota de alcance; aún no hay specs ejecutables. |
| docs/ | Requisitos, decisiones, tareas, validación y DTS. |
| .github/workflows/ | Validación de la base preparada para GitHub. |

No hay src o build web en esta revisión. La estructura de interfaz se establece en DR-001.

## Componentes previstos

| Componente | Responsabilidad |
| --- | --- |
| Configuración | Juego, Drop, set, dificultad y modo de ruta. |
| Tarjeta | Cuerdas, trastes, notas y estado neutro/solución. |
| Respuesta | Cuatro botones o dos desplegables. |
| Grados | Cuatro destinos, arrastre, dos toques y teclado. |
| Rutas | Partida fija y una candidata visible. |
| Corrección | Resultado por campos y avance explícito. |

Compartir el renderizador conserva proporciones entre juegos. El icono final sigue pendiente; el brief está en `docs/VISUAL.md`.

## Estado y persistencia

Modelo previsto: configuración, pregunta, pregunta verificada y regreso al menú. Cada pregunta identifica datos y guarda sus opciones y orden.

Seleccionar no evalúa. Verificar exige respuesta completa y produce un único resultado. Después se bloquea la respuesta. Siguiente genera otra pregunta y Salir vuelve al menú.

La corrección no sobrescribe lo que contestó el usuario. Si falla el V de una ruta, el paso V-I debe partir del V correcto.

DR-006 añadirá progreso local con esquema independiente de la versión de app. Ninguna persistencia está implementada todavía.

## Modelo musical

Afinación estándar EADGBE. MIDI al aire, cuerdas 6 a 1: 40,45,50,55,59,64. Altura real igual a MIDI al aire más traste.

Calidades evaluables en C: maj7 (0,4,7,11), 7 (0,4,7,10), m7 (0,3,7,10) y m7(b5) (0,3,6,10). Grados reales, incluidas b3, b5 y b7.

Inversión por bajo real: raíz, tercera, quinta o séptima. No deducirla del primer elemento de un array.

Cdim7 se conserva como referencia: 0,3,6,9 y bb7. La fuente rotula su séptima como °7. El acorde es simétrico y no se evalúa sin fijar raíz y contexto.

## Catálogo y construcción de voicings

No se generan posiciones nuevas. Drop 2 tiene tres sets; Drop 3 y Drop 2+4, dos cada uno. Cuatro calidades y cuatro inversiones dan 112 posiciones evaluables. Hay otras doce disminuidas de referencia.

La auditoría verifica cuerda/traste, fórmula, grados, bajo y orden por Drop. La extracción analiza datos literales sin ejecutar JavaScript. --check confirma que los JSON coinciden con la fuente sin sobrescribir.

Mantener ventana corta de las tarjetas. Algunas formas abarcan cinco trastes: no recortar para imponer una ventana de tres.

## Rutas y conducción de voces

Normalizadas solo Drop 2 sets 1 y 2, mayor y menor, cuatro inversiones iniciales: dieciséis rutas.

| II | V | I |
| --- | --- | --- |
| Fundamental | 2ª | Fundamental |
| 1ª | 3ª | 1ª |
| 2ª | Fundamental | 2ª |
| 3ª | 1ª | 3ª |

Mayor Dm7-G7-Cmaj7. Menor Dm7(b5)-G7-Cm7. Comparar con la ruta exacta del material. Otra inversión de G7 puede ser musicalmente válida y no corresponder a este ejercicio.

No aplicar un optimizador que sustituya estas rutas ni afirmar mínimo universal. C6 aparece como sustitución opcional en ciertos pasos de la fuente; no se convierte automáticamente en otro acorde evaluable.

## Preguntas y corrección

Diseño acordado: fácil elige nombre con cuatro botones; medio añade inversión en un segundo desplegable; difícil añade colocar grados sobre círculos.

Opciones únicas y una correcta. En tests, fixture o semilla reproducible. El banco difícil es fijo con alteraciones y distractores; ofrecer solo los grados correctos daría una pista.

Corrección por acorde, inversión y cada destino. Acierto completo exige todos los campos del nivel. Registrar una sola respuesta por primer intento y bloquear cambios al verificar.

## Móvil y accesibilidad

El fondo es el tramo corto de mástil de las tarjetas, no un mástil completo de doce trastes. En rutas, partida arriba, candidata debajo y selector 1/2/3/4; no cuatro candidatas pequeñas simultáneas.

Pregunta con círculos grises y fondo común. No revelar solución mediante nombre, título, tooltip o nombre accesible de las opciones. Al corregir, recuperar colores musicales y usar texto/símbolos además de rojo/verde.

Arrastre con tolerancia, alternativa de tocar ficha y destino y operación por teclado. Áreas táctiles mayores que los círculos visibles. Se prevén E2E a 360,390 y 430 px; aún no ejecutables.

## Offline e instalación

DR-006 prevé PWA instalable, caché de recursos propios y recarga sin conexión tras una primera carga completa.

Progreso por dispositivo, sin sincronización, cuentas, backend o notificaciones. Probar almacenamiento bloqueado, datos dañados y migración. No hay manifest PWA, service worker o instalación comprobada todavía.

## Documentación y Claude

`CLAUDE.md` importa `AGENTS.md` y dirige al contrato y a la orden solicitada. Las reglas permanentes están versionadas. Las tareas concretas se describen en DR-001 a DR-007 y se ejecutan por separado.

Se adapta el flujo de Mástil Escalas: rama por objetivo, pruebas dirigidas durante ajustes, revisión funcional y batería final aplicable. Un cambio material de diseño actualiza el DTS principal y sus derivados en la misma rama.

La preparación se conserva como paquete duradero. El 13/10/2026 el usuario autorizó la publicación de la base completa en el repositorio público, incluidos los originales.

## Flujo de datos

Previsto: configuración selecciona registros; generador crea pregunta estable; tarjeta dibuja geometría; el usuario compone respuesta; evaluador calcula resultado según contrato.

En rutas, pregunta identifica ruta y paso. Cambiar candidata no cambia la partida. El estado de selección no altera los datos musicales.

La futura sesión y el núcleo musical deben poder probarse sin DOM; los componentes consumen el catálogo sin duplicar posiciones.

## Pruebas y resultados reales

La reconstrucción ha ejecutado 24 tests con node:test: todos pasan, sin omitidos. Verifican catálogo completo, rutas, hashes de fuentes y rechazo de errores deliberados.

La auditoría pasa con 124 posiciones (112 evaluables y doce de referencia) y 16 rutas. Hay oráculos independientes para D2S1 mayor primera inversión y D2S2 menor fundamental.

Se prueba también una forma G7 válida en otra inversión que no cumple la ruta. Los tests no se limitan a comparar las tablas consigo mismas.

Vitest, lint, build web y Playwright se incorporarán en DR-001. Estos resultados no se presentan como cobertura del juego, que todavía no existe.

## Construcción y publicación

npm run docs:build regenera LaTeX/PDF desde el Markdown. Guarda hashes del Markdown, derivados, plantilla y generador para detectar desactualizaciones.

La CI preparada ejecuta npm ci y npm run validate. Esta revisión del DTS es previa a la publicación inicial; su ejecución remota se comprobará después del push. El código en Git tampoco equivale a tener el juego desplegado.

El primer push fue bloqueado por revisión automática debido al repositorio público y los materiales originales. El 13/10/2026 se obtuvo autorización explícita del usuario para publicar la base completa. Las futuras publicaciones siguen requiriendo una orden que las cubra.

## Limitaciones actuales

- No existe aún interfaz, icono final, progreso, PWA o revisión funcional móvil.
- Solo se normalizaron las rutas Drop 2 sets 1 y 2 del HTML.
- Los PDF tienen 21 páginas de imágenes cada uno; no se han transcrito íntegramente.
- Cdim7 y C6 no son calidades evaluables de la primera etapa.
- Transposición y audio quedan para otra etapa.
- La reconstrucción conserva contratos y datos, no recupera el commit local perdido byte a byte.
- Hosting y licencia del código nuevo pendientes; las referencias conservan su autoría.

## Evolución

DR-001 configura herramientas; DR-002 crea tarjetas e icono; DR-003 y DR-004, reconocimiento; DR-005, rutas; DR-006, progreso/PWA; DR-007, cierre documental y pruebas.

Convertir lo planificado en descripción de implementación solo después de inspeccionar y probar el código. No extender una tarea a mejoras no pedidas.

## Apéndice: evidencia y límites

Verificados: mismas tres referencias, SHA-256, extracción, notas físicas, fórmulas, grados, inversiones, rutas y 24 tests ejecutados nuevamente. Documentación reconstruida desde las decisiones visibles de la conversación.

No se ha ejecutado Claude Code en el equipo del usuario ni implementado el juego. Esta revisión documenta el candidato anterior a la publicación inicial autorizada. La compilación del DTS, revisión visual y validación documental se registran en `docs/validation/2026-10-13-foundation.md`.
