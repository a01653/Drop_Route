# Drop Route: instrucciones permanentes

@AGENTS.md

## Leer al comenzar

Lee docs/PROJECT.md, docs/DECISIONS.md y docs/DTS.md. Después abre la orden de trabajo indicada por el usuario. Para cambios musicales lee docs/MUSIC.md; para dibujos y móvil, docs/VISUAL.md.

La interfaz se reduce a la pantalla de arranque de DR-001 y a la de revisión de tarjetas e icono de DR-002; los juegos todavía no existen. Ejecuta una sola orden de trabajo por petición. No conviertas DR-001 en la implementación completa del juego.

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

Los tests de la base usan node:test y verifican los datos; Vitest cubre las capas de src y Playwright el humo del build. No hay pruebas de juego aún. Consulta docs/TEST_PLAN.md. No inventes resultados o comandos.

Distingue siempre lo existente de lo planificado. Actualiza los requisitos y el DTS en Markdown en la misma rama si cambia su comportamiento documentado.

Durante DR-001 a DR-006 no regeneres LaTeX/PDF ni prepares los manuales completos o sus capturas. Se concentran en DR-007 por decisión del usuario. Ejecuta docs:check en cada fase; en DR-007 aplica también docs:check:final y la revisión visual completa indicada en AGENTS.md. Los tests del código no se aplazan.

Referencia de instrucciones persistentes: https://code.claude.com/docs/en/memory
