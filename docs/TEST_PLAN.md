# Plan de pruebas

## Actual

24 pruebas ejecutables con node:test. Validación física de 124 posiciones y 16 rutas. Integridad SHA-256, extracción reproducible y enlaces documentales.

No hay interfaz, build web o E2E ejecutables todavía. No crear tests omitidos que simulen cobertura.

## Matriz futura

| Área | Comportamiento a probar |
| --- | --- |
| Preguntas | Opciones únicas, una correcta, azar reproducible, no repetir inmediatamente si hay alternativas. |
| Respuesta | Fácil no exige inversión; medio sí; difícil exige cuatro destinos. Incompleto no verifica. |
| Corrección | Por campos; una sola puntuación por primer intento; respuesta bloqueada tras verificar. |
| Rutas | Cuatro candidatas de misma calidad, solución exacta, partida estable y transición desde V correcto. |
| Grados | Alteraciones, dos toques, arrastre, devolución, sustitución, teclado y pointercancel. |
| Móvil | Anchos 360/390/430 px, controles táctiles, una candidata visible y sin recortes. |
| Pistas | Fondo y círculos neutros; sin solución en títulos, tooltips o nombres accesibles. |
| Persistencia | Almacenamiento bloqueado o dañado, recarga y migración de esquema. |
| PWA | Recarga offline tras primera carga e instalación técnica real. |

## E2E

Selección por familia y set, fácil correcto/incorrecto, medio con inversión fallida, difícil incompleto y completo por dos toques/arrastre, rutas II-V y V-I, Tu respuesta/Solución, Siguiente, Salir y teclado.

Usar fixtures o semilla solo en entorno de prueba. No depender del azar de producción. Probar sobre build actual.

## Flujo

Pruebas dirigidas durante ajustes y batería completa al cierre. DR-001 añadirá Vitest, lint, build y Playwright, conservando los tests musicales y sus oráculos. Excluir e2e y worktrees ampliando configDefaults.exclude, sin eliminar defaults.

Registrar resultados reales en docs/validation. Los resultados de Mástil no son resultados de Drop Route.
