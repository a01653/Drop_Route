# Requisitos del producto

Propietario: Jesús Quevedo Rodríguez. Diseño acordado el 12/10/2026; base reconstruida el 13/10/2026.

## Alcance

Estudiar posiciones, inversiones, grados y rutas II-V-I concretas. Ordenador y móvil. Primera etapa en C. Ventana corta del mástil con apariencia de las láminas, no un mástil de doce trastes.

| ID | Comportamiento |
| --- | --- |
| R01 | Elegir juego, Drop, set y dificultad. Mostrar las cuerdas del set. |
| R02 | Una posición sin respuesta visible por pregunta de reconocimiento. |
| R03 | Fácil: cuatro botones Cmaj7, C7, Cm7 y Cm7(b5), orden variable. |
| R04 | Medio: dos desplegables, acorde e inversión (Fundamental, 1ª, 2ª, 3ª). |
| R05 | Difícil: añade colocar grados sobre círculos grises, por arrastre o dos toques. |
| R06 | Verificar habilitado con respuesta completa. Seleccionar no verifica. |
| R07 | Tras verificar, bloquear respuesta, marcar resultado con rojo/verde y texto, conservar lo contestado y mostrar solución. |
| R08 | Corregir acorde, inversión y cada grado por separado; acierto completo exige todos los campos del nivel. |
| R09 | Siguiente genera otra pregunta; sesión libre hasta Salir. |
| R10 | Salir vuelve al menú. |
| R11 | Rutas: elegir mayor/menor y un set con datos. Partida siempre visible. |
| R12 | Una candidata dibujada cada vez, botones 1/2/3/4 y deslizamiento opcional. |
| R13 | Verificar compara con la ruta exacta; Tu respuesta/Solución permite comparar sin cuatro diagramas simultáneos en móvil. |
| R14 | Practicar II-V y V-I; V-I parte del V correcto de esa ruta. |
| R15 | Fondo común y círculos neutros antes de verificar; sin etiquetas o colores que den pistas. Recuperar colores musicales en solución. |
| R16 | Operación con ratón, teclado y tacto; resultado comprensible sin distinguir colores. |
| R17 | Progreso local en el dispositivo: contadores de intentos y aciertos por juego, set y dificultad (reconocimiento) o set, modo y tramo (rutas), y la configuración del menú. Cada pregunta verificada cuenta una vez; el acierto completo exige todos los campos del nivel o la candidata de nuestra ruta. |
| R18 | Al recargar o reabrir se vuelve al menú con lo guardado; una pregunta abierta no se reanuda. |
| R19 | Almacenamiento ilegible, bloqueado, lleno o de una versión posterior del esquema: se avisa, se puede seguir jugando y no se destruye lo guardado. Antes de reparar o migrar se conserva una copia del original; si la copia falla, no se sobrescribe. |
| R20 | PWA instalable que, tras una primera carga completa, recarga y se juega sin conexión. Una versión nueva espera y solo se activa a petición explícita desde el menú; si lo que hay en la página no está guardado, el aviso lo dice antes. La actualización no borra el progreso. |

## Datos de rutas

Drop 2 sets 1 y 2, mayor y menor; cuatro inversiones iniciales. No ofrecer sets sin rutas normalizadas. Las demás familias sí están disponibles para reconocimiento.

Mayor: Dm7-G7-Cmaj7. Menor: Dm7(b5)-G7-Cm7. La respuesta pertenece a nuestra secuencia, no es la única posibilidad musical.

## Etapas posteriores

El progreso local y la PWA (R17 a R20) se implementaron en DR-006, pendiente de revisión. Sin cuentas, backend, sincronización ni notificaciones. Sin puntuación avanzada, rachas ni clasificaciones. Estudio, repaso adaptativo, sesiones de diez preguntas, Ver movimiento, audio y transposición son ampliaciones posibles, fuera del alcance actual. DR-007 cierra la documentación y los manuales.
