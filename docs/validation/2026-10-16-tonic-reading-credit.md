# Tónica de referencia y autoría

Fecha: 16/10/2026. Orden: DR-010. Rama: `fix/tonic-recognition-credit`, desde `63a184fd5777bd75883b573d4a78eecc68c9b4c0`. Paquete preparado: 1.0.2.

## Comportamiento

Cada pregunta de reconocimiento muestra «Tónica: C» en la cabecera. Los círculos siguen neutros y no se adelantan ubicaciones ni equivalencias. Tras verificar, la corrección indica la cuerda y el traste de la tónica y explica C6/Am7 o Cm7/E♭6 cuando las notas físicas admiten esas dos lecturas. La inversión equivalente se obtiene del bajo real; la respuesta se sigue corrigiendo respecto a la tónica anunciada.

Ejemplos comprobados: A-E-G-C es C6 en tercera inversión respecto a C y Am7 en estado raíz respecto a A; C-G-B♭-E♭ es Cm7 en estado raíz respecto a C y E♭6 en tercera inversión respecto a E♭. Los tests cambian la raíz sin mover las notas y comprueban las dos evaluaciones. El pie común muestra «Creado por Jesús Quevedo Rodríguez» en pequeño después del contenido.

## Validación final

- `npm run validate`: extracción intacta, auditoría de 124 posiciones y 16 rutas, 87 pruebas de base, 337 pruebas Vitest y documentación sincronizada. Sin fallos ni omitidos.
- `npm run lint`: correcto.
- Build y typecheck: correctos, generados por la batería E2E.
- Batería completa Playwright: 218 ejecuciones correctas, sin fallos ni omitidos, en escritorio y móvil. Incluye los seis casos de tónica/autoría, arrastre, corrección móvil, rondas, rutas, progreso, uso sin conexión y actualización de la PWA.
- Los JSON musicales no tienen cambios. La lectura es una función pura y las 112 formas evaluables conservan sus datos.
- DTS LaTeX/PDF regenerados: 17 páginas, sin desbordes de LaTeX. Revisadas las miniaturas de todas las páginas y la página modificada a mayor resolución. Se corrigió el símbolo bemol en la plantilla, que la fuente tipográfica omitía. Los manuales cerrados conservan sus fuentes y derivados.
- Capturas revisadas a 360×640 y 1440×900: tónica visible antes de responder, explicación después, autoría separada y sin desplazamiento horizontal. La corrección larga de móvil se lee desplazándose.

La primera batería completa detectó cuatro fallos de arrastre en escritorio: el texto añadido sobre la tarjeta desplazaba el banco por debajo del viewport de 720 px. Se trasladó la tónica a la cabecera; después pasaron 58 casos dirigidos y la batería completa de 218 casos sobre el código final.

## Capturas

- [Pregunta móvil](capturas-tonic-reading/pregunta-movil.png).
- [Corrección móvil](capturas-tonic-reading/correccion-movil.png).
- [Pregunta de escritorio](capturas-tonic-reading/pregunta-escritorio.png).
- [Corrección de escritorio](capturas-tonic-reading/correccion-escritorio.png).

## Entorno y límites

El conector de Drop Route devolvió `Internal error -32603`; el conector disponible de Compás a compás confirmó que su carpeta y su repositorio son distintos. Codex completó la revisión y la validación, sin trabajo de Claude ni otros subagentes.

No estaba instalado el Chromium solicitado por Playwright y su descarga produjo un archivo inválido. Se utilizó Chromium 153.0.8010.0 ya disponible en el entorno, mediante una configuración temporal fuera del repositorio que solo cambia la ruta del ejecutable y la salida de pruebas. Se mantuvieron los proyectos, tests y servidor de build del proyecto. No se ha probado en un teléfono físico, Safari, Firefox ni con el Chromium 156 fijado por esta instalación de Playwright.

Tras la validación y la presentación de las capturas, el 16/10/2026 el usuario autorizó expresamente «commit, merge, push y publicación». Esta entrega mantiene la versión 1.0.2 y el código probado; el cierre solo actualiza la autorización y los derivados documentales. El resultado de CI y despliegue se comprueba en GitHub Actions sobre el commit publicado. No se crea un tag como parte de esta orden.
