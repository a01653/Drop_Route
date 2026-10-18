// Contrato de las capturas del manual: los nombres de fichero y lo que muestra cada figura. Los manuales de DR-007
// citan estos identificadores; cambiar uno exige cambiar el manual. Cada figura se captura exactamente una vez por
// ejecución y la ejecución falla si falta alguna o sobra otra.

export type ViewportKind = 'movil' | 'escritorio'
export type FigureGame = 'menu' | 'reconocimiento' | 'rutas' | 'progreso'

export interface ViewportSpec {
  width: number
  height: number
  deviceScaleFactor: number
}

/** Móvil a 360 px, el ancho más estrecho que admite la aplicación, a doble densidad para que el texto se lea impreso. */
export const VIEWPORTS: Record<ViewportKind, ViewportSpec> = {
  movil: { width: 360, height: 780, deviceScaleFactor: 2 },
  escritorio: { width: 1280, height: 800, deviceScaleFactor: 1 },
}

export interface Figure {
  /** Nombre del fichero sin extensión: docs/manuals/capturas/<id>.png */
  id: string
  title: string
  game: FigureGame
  viewport: ViewportKind
  /** Estado de la aplicación que debe verse, verificado por el test antes de capturar. */
  state: string
}

export const FIGURES: readonly Figure[] = [
  {
    id: 'menu-reconocimiento-360',
    title: 'Menú con «Reconocer voicings»',
    game: 'menu',
    viewport: 'movil',
    state: 'Menú recién abierto, juego de reconocimiento seleccionado, sin progreso guardado.',
  },
  {
    id: 'menu-rutas-360',
    title: 'Menú con «Rutas II-V-I»',
    game: 'menu',
    viewport: 'movil',
    state: 'Menú con el juego de rutas seleccionado: solo Drop 2, modo y tramo, sin dificultad.',
  },
  {
    id: 'facil-pregunta-360',
    title: 'Fácil: pregunta neutra',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta abierta en fácil: tarjeta con círculos grises y cuatro botones de acorde, sin nada elegido.',
  },
  {
    id: 'facil-correccion-360',
    title: 'Fácil: error corregido',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta fácil verificada con un acorde equivocado: el elegido en rojo, el correcto en verde y la tarjeta con los colores musicales.',
  },
  {
    id: 'medio-pregunta-360',
    title: 'Medio: acorde e inversión',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta abierta en medio: tarjeta neutra y los dos desplegables, Acorde e Inversión, sin elegir.',
  },
  {
    id: 'medio-correccion-360',
    title: 'Medio: acierto parcial',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta medio verificada con el acorde correcto y la inversión equivocada: corrección campo por campo.',
  },
  {
    id: 'dificil-pregunta-360',
    title: 'Difícil: colocar los grados',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta abierta en difícil: acorde e inversión elegidos, dos grados colocados sobre los círculos y el banco de fichas en gris.',
  },
  {
    id: 'dificil-correccion-360',
    title: 'Difícil: corrección por campos',
    game: 'reconocimiento',
    viewport: 'movil',
    state: 'Pregunta difícil verificada con un solo grado equivocado: cinco campos correctos, uno incorrecto y la tarjeta con su solución.',
  },
  {
    id: 'ruta-pregunta-360',
    title: 'Ruta: partida y candidata',
    game: 'rutas',
    viewport: 'movil',
    state: 'Pregunta de ruta abierta: la partida visible, una candidata neutra y el selector 1 a 4 con Verificar.',
  },
  {
    id: 'ruta-fallo-solucion-360',
    title: 'Ruta: no es la de nuestra ruta, Solución',
    game: 'rutas',
    viewport: 'movil',
    state: 'Ruta verificada con otra candidata: selector bloqueado con la elegida en rojo y la de la ruta en verde, y la Solución en el comparador.',
  },
  {
    id: 'ruta-fallo-tu-respuesta-360',
    title: 'Ruta: no es la de nuestra ruta, Tu respuesta',
    game: 'rutas',
    viewport: 'movil',
    state: 'La misma pregunta de ruta con «Tu respuesta» en el comparador: la candidata que se eligió.',
  },
  {
    id: 'progreso-detalle-360',
    title: 'Progreso con el detalle de ambos juegos',
    game: 'progreso',
    viewport: 'movil',
    state: 'Panel «Tu progreso» tras jugar de verdad reconocimiento (fácil, medio y difícil) y rutas, con «Ver todo el detalle» abierto.',
  },
  {
    id: 'escritorio-menu-1280',
    title: 'Vista general en ordenador',
    game: 'menu',
    viewport: 'escritorio',
    state: 'Menú a 1280 px de ancho con el progreso de una pregunta verificada en cada juego.',
  },
]
