# Fixtures del esquema guardado

## schema-0.json: formato de prueba, no una versión publicada

Drop Route no ha publicado ninguna versión que guarde progreso: el esquema 1 es el primero que se escribe en dispositivos reales. El esquema 0 de este fixture es un formato inventado para poder probar de verdad la cadena de migración (`MIGRATIONS` en `schema.ts`) antes de que haga falta una migración real.

Forma del esquema 0, que difiere a propósito del 1:

| Campo | Esquema 0 | Esquema 1 |
| --- | --- | --- |
| Contadores | `counters`, con claves separadas por `/` y pares `[intentos, aciertos]` | `progress`, con claves separadas por `:` y objetos `{ attempts, correct }` |
| Configuración | Sin `drop` | Con `drop`, deducido del set al migrar |

El campo `_fixture` solo documenta el fichero y la migración lo ignora. Los tests lo usan para comprobar la migración 0 a 1, que se conserve el documento original antes de reescribirlo y que un documento con contadores inválidos se repare sin perder los válidos.

Cuando haya un esquema 2 real, el esquema 1 pasará a ser una versión anterior de verdad y este fixture seguirá probando que la cadena completa 0 a 2 funciona.
