# Drop Route: instrucciones permanentes

@AGENTS.md

## Leer al comenzar

Lee docs/PROJECT.md, docs/DECISIONS.md y docs/DTS.md. Después abre la orden de trabajo indicada por el usuario. Para cambios musicales lee docs/MUSIC.md; para dibujos y móvil, docs/VISUAL.md.

La interfaz tiene el menú, el juego de reconocimiento en sus tres dificultades (DR-003 y DR-004), el de rutas II-V-I de Drop 2 (DR-005) y la pantalla de revisión de tarjetas e icono (DR-002), todo integrado en main. El progreso local y la PWA (DR-006) están implementados en feat/progress-and-pwa, pendientes de revisión; falta el cierre documental (DR-007). Ejecuta una sola orden de trabajo por petición, salvo que el usuario autorice expresamente un bloque (DR-003 con DR-004, DR-005 por separado o DR-006 con DR-007): véase «Bloques de órdenes» en AGENTS.md. No conviertas DR-001 en la implementación completa del juego.

## Reglas del producto

- Nombre Drop Route. Comunicación e interfaz en español de España, con tuteo.
- Primera etapa en C. Catálogo: Cmaj7, C7, Cm7 y Cm7(b5), cuatro inversiones y siete sets.
- Juegos: reconocer voicings y continuar las rutas II-V-I de la plantilla.
- Fácil: cuatro botones de acorde. Medio: acorde e inversión mediante dos desplegables. Difícil: añade grados sobre cuatro círculos.
- Pregunta neutra: círculos grises y fondo común, sin nombres, grados o colores que revelen la solución.
- Corregir por campos, con texto y rojo/verde; recuperar los colores musicales al mostrar la solución.
- Mástil corto como nuestras tarjetas. No crear uno completo de doce trastes.
- Rutas: partida visible y una forma candidata visible cada vez. Selector 1/2/3/4, Verificar y Siguiente.
- Difícil permite arrastre, tocar ficha + destino y teclado.
- Rutas mayores Dm7-G7-Cmaj7; menores Dm7(b5)-G7-Cm7. No sustituir el I menor por otra calidad.
- Otra posición válida de G7 fuera de nuestra ruta no se describe como musicalmente incorrecta.

## Datos

Usa data/catalog.json y data/routes.json. La autoridad de esta etapa es references/laminas-drop-original.html. Los PDF complementan las posiciones y conservan su autoría.

No trasplantes el empaquetador HTML a la app. Implementa un renderizador SVG manteniendo la apariencia. No inventes posiciones ni optimices las secuencias existentes por iniciativa propia.

Cdim7 se conserva como referencia y no se ofrece en preguntas. C6 es una sustitución opcional citada en la fuente, aún no evaluable.

## Verificación y documentación

Los tests de la base usan node:test y verifican los datos, el icono y el generador del service worker; Vitest cubre las capas de src, incluido el progreso, y Playwright el humo del build, las tarjetas, los juegos de reconocimiento y rutas, el progreso, el modo sin conexión y la actualización de la PWA. El progreso guardado tiene un esquema versionado aparte de la app: no cambies su formato sin una migración y sin conservar copia del original. Consulta docs/TEST_PLAN.md. No inventes resultados o comandos.

Distingue siempre lo existente de lo planificado. Actualiza los requisitos y el DTS en Markdown en la misma rama si cambia su comportamiento documentado.

Durante DR-001 a DR-006 no regeneres LaTeX/PDF ni prepares los manuales completos o sus capturas. Se concentran en DR-007 por decisión del usuario. Ejecuta docs:check en cada fase; en DR-007 aplica también docs:check:final y la revisión visual completa indicada en AGENTS.md. Los tests del código no se aplazan.

Referencia de instrucciones persistentes: https://code.claude.com/docs/en/memory
