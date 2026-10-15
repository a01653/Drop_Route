# Reglas de trabajo

## Inicio

Lee la orden, comprueba git status --short y la rama activa. Una rama por objetivo, creada antes del primer cambio: feat/, fix/, docs/, test/ o chore/. Si el árbol está limpio, parte de main actualizado con git pull --ff-only.

DR-001 a DR-007 forman la primera versión y están integradas en `main`. Las ampliaciones posteriores se abren como una orden nueva y una rama nueva por objetivo. No mezclar cambios ajenos ni reutilizar una rama histórica para una función nueva.

## Criterio

- Separa datos, lógica musical pura, sesión, persistencia e interfaz.
- Comprueba notas físicas y bajo real al tocar posiciones o inversiones.
- Conserva las referencias originales y una sola definición de datos.
- Señala contradicciones musicales o pedagógicas concretas antes de implementar. Resuelve detalles menores compatibles sin frenar el trabajo.
- No añadas funciones fuera de la orden solicitada.
- No uses subagentes o delegación salvo petición del usuario.
- Las transformaciones de estudio no modifican `data/catalog.json` ni `data/routes.json`: operan sobre copias derivadas en memoria.

El 13/10/2026 el usuario autorizó expresamente subir la base completa a a01653/Drop_Route, incluyendo la plantilla HTML y las dos guías PDF originales, conociendo que quedarían públicas. Las publicaciones posteriores requieren una orden que cubra commit, merge, push o despliegue.

## Durante los ajustes

Pruebas dirigidas del comportamiento y sus consumidores. Regresión unitaria para fallos lógicos y E2E para interfaz/estado cuando corresponda. Un filtro sin casos no valida nada.

No ejecutar la batería completa en cada retoque. Antes de E2E o revisión visual con Vite, generar el build actual y comprobar que el preview lo sirve. No iniciar preview automáticamente.

Comandos disponibles: npm test, npm run audit:music, npm run data:check, npm run docs:check, npm run docs:check:final, npm run validate, npm run dev, build, preview, typecheck, lint, npm run icon:export y npm run test:e2e.

## Cierre

Entregar cambios revisables con pruebas, límites y aspectos a revisar. Tras aprobación funcional, congelar alcance y ejecutar una vez la batería final aplicable sobre el estado exacto.

Una aprobación funcional no autoriza commit, merge, tag, push o publicación. Hace falta una orden que nombre o cubra esas acciones. No publicar con validaciones obligatorias fallidas.

Una versión por entrega. No incrementarla por ajustes, previews o cambios documentales. No hacer force push, borrar ramas remotas o cambiar visibilidad por iniciativa propia.

## DTS y manuales

`docs/DTS.md` es la fuente principal. `docs/latex/DTS_Drop_Route.tex` y su PDF son derivados. Los manuales Markdown y sus derivados están cerrados desde DR-007.

La política `docs/documentation-policy.json` está en `required`: `npm run docs:check` y `npm run docs:check:final` exigen que DTS y manuales derivados estén sincronizados. Si una ampliación cambia materialmente arquitectura, navegación, persistencia, build o límites descritos en el DTS, actualizar el Markdown y regenerar LaTeX/PDF en el mismo cierre documental; no modificar a mano los derivados ni rebajar la política para hacer pasar la CI.

README, requisitos, órdenes de trabajo y registros de validación deben reflejar el estado real de cada entrega.
