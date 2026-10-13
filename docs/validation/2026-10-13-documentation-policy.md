# Validación del calendario documental

Fecha: 13/10/2026. Base: main publicado en 72ccefab047bbdaded4318e3e3ef4ede13cb55d5. Rama de preparación: docs/defer-final-docs.

El usuario ha pedido concentrar LaTeX/PDF, manuales completos, capturas y revisión visual documental en DR-007. Se mantienen el DTS Markdown, README, instrucciones, pruebas y registros durante DR-001 a DR-006.

## Resultados locales

| Comprobación | Resultado |
| --- | --- |
| npm run validate | Correcto: extracción, auditoría, tests y documentación. |
| Datos musicales | 124 posiciones, 112 evaluables, 12 de referencia y 16 rutas; originales intactos. |
| npm test | 33 tests correctos, cero fallos u omitidos: 24 musicales y 9 de política documental. |
| docs:check | Correcto, con DTS Markdown declarado pendiente de regeneración en DR-007. |
| docs:check:final | Rechazo esperado por DTS Markdown pendiente; confirma que el cierre no admite esa excepción. |
| Fixture de cierre sincronizado | Correcto en modo estricto. |
| Fixtures negativos | Rechazo de derivados alterados/ausentes, política inválida, manifiesto ausente/incompleto y entradas inválidas. |
| git diff --check | Correcto. |

No se ha ejecutado docs:build ni se han modificado los derivados existentes. npm ha mostrado un aviso sobre la configuración http-proxy del entorno de ejecución, ajeno al proyecto.

## Integración con DR-001

Los cambios de DR-001 informados por el usuario están sin publicar en su equipo y no se han inspeccionado ni sustituido. Integrar esta política conservando esos cambios, incluidos sus scripts, la CI ampliada y las adaptaciones documentales para Windows. Al combinar package.json, añadir docs:check:final sin reemplazar los scripts existentes.

Las pruebas de node:test deben incluir también tests/documentation-policy.test.mjs; conservar las 24 garantías musicales. Si la orden anterior pedía regenerar el PDF para cerrar DR-001, este calendario aprobado por el usuario sustituye ese requisito.

La CI remota no se ha ejecutado para este cambio, que se entrega como parche para integración. El registro de reconstrucción y los manifiestos de recuperación siguen siendo evidencia histórica de la base inicial.
