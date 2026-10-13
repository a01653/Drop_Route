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

Actualmente existen npm test (node:test y Vitest), npm run audit:music, npm run data:check, npm run docs:check, npm run docs:check:final, npm run validate, npm run dev, build, preview, typecheck, lint, npm run icon:export y npm run test:e2e (Playwright).

## Cierre

Entregar cambios revisables con pruebas, límites y aspectos a revisar. Tras aprobación funcional, congelar alcance y ejecutar una vez la batería final aplicable sobre el estado exacto.

Una aprobación funcional no autoriza commit, merge, tag, push o publicación. Hace falta una orden que nombre o cubra esas acciones. No publicar con validaciones obligatorias fallidas.

Una versión por entrega. No incrementarla por ajustes, previews o cambios documentales. No hacer force push, borrar ramas remotas o cambiar visibilidad por iniciativa propia.

## DTS y manuales

docs/DTS.md es la fuente principal. docs/latex/DTS_Drop_Route.tex y su PDF son derivados.

Durante DR-001 a DR-006, actualizar docs/DTS.md cuando cambien arquitectura, modelo musical, estado/persistencia, navegación, flujos, dependencias, estrategia de pruebas, build/despliegue o limitaciones. Mantener también README, instrucciones y registro de validación correctos. No copiar cifras de tests de Mástil.

El usuario ha decidido el 13/10/2026 aplazar la generación de LaTeX/PDF, los manuales completos, las capturas y la revisión visual documental a DR-007. No ejecutar docs:build ni repetir esa revisión al cerrar cada fase intermedia, salvo petición expresa. Conservar los derivados existentes como la última edición generada; no presentarlos como documentación actualizada.

docs/documentation-policy.json declara si los derivados están aplazados o son obligatorios. npm run docs:check comprueba enlaces, documentos e integridad de los derivados existentes; en modo deferred informa de los cambios pendientes sin exigir recompilación. Esta excepción no permite archivos ausentes, manifiestos inválidos o derivados alterados.

En DR-007, terminar el DTS Markdown y los manuales de uso e instalación según el funcionamiento real. Ejecutar npm run docs:build, renderizar y revisar todas las páginas, resolver desbordes y referencias pendientes, cambiar dtsDerivatives a required y ejecutar npm run docs:check:final. Entregar entonces Markdown, LaTeX, PDF y manuales coherentes. Las pruebas de código y las auditorías siguen siendo obligatorias en cada fase.
