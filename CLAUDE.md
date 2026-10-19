# Drop Route: instrucciones permanentes

@AGENTS.md

## Leer al comenzar

Lee docs/PROJECT.md, docs/DECISIONS.md y docs/DTS.md. Después abre la orden de trabajo indicada por el usuario. Para cambios musicales lee docs/MUSIC.md; para dibujos y móvil, docs/VISUAL.md.

DR-001 a DR-007 están integradas en `main`: interfaz, reconocimiento, rutas II-V-I de Drop 2, progreso local, PWA, documentación y publicación en GitHub Pages. Las ampliaciones se abren como órdenes nuevas; DR-008 añade modo estudio, movimiento de voces y transposición del material de estudio. Ejecuta solo la orden solicitada, salvo autorización expresa del usuario para un bloque.

## Reglas del producto

- Nombre Drop Route. Comunicación e interfaz en español de España, con tuteo.
- Los juegos evaluables permanecen en C mientras una orden no amplíe expresamente ese alcance.
- Catálogo base: Cmaj7, C7, Cm7 y Cm7(b5), cuatro inversiones y siete sets.
- Juegos: reconocer voicings y continuar las rutas II-V-I de la plantilla.
- Modo estudio: consultar voicings y rutas sin evaluación; puede transponer visualmente las formas sin alterar los JSON fuente.
- En transposición de estudio, desplaza todas las voces de una forma la misma cantidad. En una ruta aplica un único desplazamiento común a II, V e I para conservar la conducción de voces.
- «Ver movimiento» describe por cuerda el cambio de traste entre acordes y no inventa una nueva ruta ni optimiza la fuente.
- Fácil: cuatro botones de acorde. Medio: acorde e inversión mediante dos desplegables. Difícil: añade grados sobre cuatro círculos.
- Pregunta neutra: círculos grises y fondo común, sin nombres, grados o colores que revelen la solución.
- Corregir por campos, con texto y rojo/verde; recuperar los colores musicales al mostrar la solución.
- Mástil corto como nuestras tarjetas. No crear uno completo de doce trastes.
- Rutas: partida visible y una forma candidata visible cada vez. Selector 1/2/3/4, Verificar, Pregunta anterior, Siguiente y Terminar test. La sesión no tiene longitud fija; al terminar, se revisan las respuestas y el voicing de la ruta sin puntuación global.
- Difícil permite arrastre, tocar ficha + destino y teclado.
- Rutas mayores Dm7-G7-Cmaj7; menores Dm7(b5)-G7-Cm7. No sustituir el I menor por otra calidad.
- Otra posición válida de G7 fuera de nuestra ruta no se describe como musicalmente incorrecta.

## Datos

Usa data/catalog.json y data/routes.json. La autoridad de esta etapa es references/laminas-drop-original.html. Los PDF complementan las posiciones y conservan su autoría.

No trasplantes el empaquetador HTML a la app. Implementa un renderizador SVG manteniendo la apariencia. No inventes posiciones ni optimices las secuencias existentes por iniciativa propia.

Cdim7 se conserva como referencia y no se ofrece en preguntas. C6 es una sustitución opcional citada en la fuente, aún no evaluable.

## Verificación y documentación

Los tests de la base usan node:test y verifican los datos, el icono y el generador del service worker; Vitest cubre las capas de src, incluido el progreso, y Playwright el humo del build, las tarjetas, los juegos de reconocimiento y rutas, el progreso, el modo sin conexión y la actualización de la PWA. Añade regresiones unitarias o E2E cuando una orden amplíe comportamiento. El progreso guardado tiene un esquema versionado aparte de la app: no cambies su formato sin una migración y sin conservar copia del original. Consulta docs/TEST_PLAN.md.

Distingue siempre lo existente de lo planificado. Actualiza los requisitos y la documentación de la misma rama cuando cambie el comportamiento documentado. La política documental está en modo `required`: no alteres DTS o manuales derivados sin regenerarlos y validarlos.

Al cerrar una entrega, sincroniza también el README con el estado verificable de GitHub y sigue en manuales el estilo orientado a tareas de Compás a compás, conservando la estructura y presentación propias de Drop Route. Aplica el flujo de ramas y cierre de `AGENTS.md`.

Referencia de instrucciones persistentes: https://code.claude.com/docs/en/memory
