# Retirada del acceso de revisión y recuperación de la actualización

15/10/2026. Rama `fix/update-recovery-and-hide-review`.

Se retira «Revisar tarjetas e icono» del menú y el CSS exclusivo de ese enlace. La ruta interna `#/revision` se conserva para las comprobaciones visuales; los accesos de juego y estudio siguen disponibles.

Se reprodujo en Chromium real un caso en el que «Actualizar ahora» no hacía nada: dos pestañas ejecutaban A y mostraban el aviso de B; la segunda activaba B, mientras la primera conservaba su documento A. Al pulsar en la primera, `registration.waiting` ya era `null` y la función salía sin recargar. El E2E nuevo falló antes de la corrección porque el documento y el script seguían siendo A, aunque el worker ya respondía desde B.

El clic ahora recarga una sola vez cuando la versión ya fue activada desde otra pestaña. Si todavía hay una versión esperando, se mantiene la activación con `SKIP_WAITING` y la recarga al cambiar el controlador. Los clics repetidos no duplican mensajes ni recargas. El cambio de controlador provocado desde otra pestaña no interrumpe automáticamente una pregunta abierta. No se borran el progreso ni la configuración guardados.

## Verificación local

- Datos de referencia y auditoría musical: correctos.
- Tests de base: 87 correctos; unitarias: 295 correctas, incluidas las regresiones de actualización y menú.
- E2E dirigidos de PWA, arranque y tarjetas: 29 correctos. Incluyen actualización real en raíz y `/Drop_Route/`, dos pestañas, progreso conservado, juego sin conexión y almacenamiento lleno o bloqueado.
- E2E de distribución responsive y estudio: 10 correctos.
- Typecheck, build, lint, `docs:check` y `docs:check:final`: correctos.
- Cada ejecución E2E generó el build actual antes de servirlo. Se usó Chromium real, sin simular el service worker ni sus cachés.

## Límite de recuperación

Una pestaña que ya está ejecutando el JavaScript antiguo conserva su manejador defectuoso hasta cargar el nuevo build. Si su botón sigue sin responder, cerrar todas las pestañas y ventanas instaladas de Drop Route y volver a abrir la aplicación permite que la versión en espera se active. No hace falta borrar los datos del sitio. La comprobación automatizada cubre Chromium, no el dispositivo físico del usuario.
