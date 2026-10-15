# Retirada del bloque «Versión actual»

Fecha: 15/10/2026. Rama: `fix/remove-version-panel`.

Se retira del inicio el bloque completo: título, descripción y cifras del catálogo. El enlace «Revisar tarjetas e icono» pasa debajo de «Modo estudio». La rejilla de escritorio pierde la fila reservada al bloque retirado y alinea el contenido arriba. El panel de progreso y los avisos de actualización mantienen su función.

Verificación local: tipos, lint y comprobación documental estricta correctos; 24 pruebas unitarias del menú y progreso y 34 E2E de arranque, distribución responsive y revisión de tarjetas correctos. Los E2E construyen el estado actual antes de servirlo. La cobertura de datos permanece en las pruebas y auditorías de la capa de datos; se elimina el escenario de interfaz que exigía las cifras del bloque retirado.

Se usa el Chromium 153.0.8010.0 disponible con una configuración temporal externa al repositorio. El ejecutable local estaba truncado y fallaba antes de abrir la aplicación; se restauró desde su archivo comprimido antes de repetir las comprobaciones de navegador.
