# Reglas de trabajo

## Inicio

Lee la orden, comprueba git status --short y la rama activa. Una rama por objetivo, creada antes del primer cambio: feat/, fix/, docs/, test/ o chore/. Si el árbol está limpio, parte de main actualizado con git pull --ff-only.

No descartar ni incluir cambios ajenos. Si una modificación previa afecta la tarea, identifica su propósito antes de actuar. Ajustes del mismo objetivo continúan en la misma rama.

El 13/10/2026 el usuario autorizó expresamente subir esta base completa a a01653/Drop_Route, incluyendo la plantilla HTML y las dos guías PDF originales, conociendo que quedarán públicas. La autorización cubre esta entrega inicial; las publicaciones posteriores siguen las reglas siguientes.

## Criterio

- Separa datos, lógica musical pura, sesión, persistencia e interfaz.
- Comprueba notas físicas y bajo real al tocar posiciones o inversiones.
- Conserva las referencias originales y una sola definición de datos.
- Señala contradicciones musicales o pedagógicas concretas antes de implementar. Resuelve detalles menores compatibles sin frenar el trabajo.
- No añadas funciones fuera de la orden solicitada.
- No uses subagentes o delegación salvo petición del usuario.

## Durante los ajustes

Pruebas dirigidas del comportamiento y sus consumidores. Regresión unitaria para fallos lógicos y E2E para interfaz/estado cuando corresponda. Un filtro sin casos no valida nada.

No ejecutar la batería completa en cada retoque. Antes de E2E o revisión visual con Vite, generar el build actual y comprobar que el preview lo sirve. No iniciar preview automáticamente.

Actualmente existen npm test, npm run audit:music, npm run data:check, npm run docs:check y npm run validate. Vitest, Playwright, lint y build se incorporan en DR-001.

## Cierre

Entregar cambios revisables con pruebas, límites y aspectos a revisar. Tras aprobación funcional, congelar alcance y ejecutar una vez la batería final aplicable sobre el estado exacto.

Una aprobación funcional no autoriza commit, merge, tag, push o publicación. Hace falta una orden que nombre o cubra esas acciones. No publicar con validaciones obligatorias fallidas.

Una versión por entrega. No incrementarla por ajustes, previews o cambios documentales. No hacer force push, borrar ramas remotas o cambiar visibilidad por iniciativa propia.

## DTS

docs/DTS.md es la fuente principal. docs/latex/DTS_Drop_Route.tex y su PDF son derivados.

Actualizar cuando cambien arquitectura, modelo musical, estado/persistencia, navegación, flujos, dependencias, estrategia de pruebas, build/despliegue o limitaciones. Una errata o retoque cosmético no exige regeneración.

Ejecutar npm run docs:build, renderizar y revisar todas las páginas y resolver desbordes o referencias pendientes. Mantener Markdown, LaTeX y PDF en la misma entrega. No copiar cifras de tests de Mástil.
