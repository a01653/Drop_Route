// Contrato de las capturas del manual: los nombres de fichero y lo que muestra cada figura. Los manuales de DR-007
// citan estos identificadores; cambiar uno exige cambiar el manual. Cada figura se captura exactamente una vez por
// ejecución y la ejecución falla si falta alguna o sobra otra.

export type ViewportKind = 'movil' | 'escritorio'
export type FigureGame = 'menu' | 'reconocimiento' | 'rutas' | 'progreso' | 'escalas' | 'estudio'

export interface ViewportSpec {
  width: number
  height: number
  deviceScaleFactor: number
}

/** Ordenador a 1280 px, a doble densidad para que el texto se lea impreso: las capturas apaisadas aprovechan el ancho de la página. El móvil (360 px) se conserva como tipo, sin figuras. */
export const VIEWPORTS: Record<ViewportKind, ViewportSpec> = {
  movil: { width: 360, height: 780, deviceScaleFactor: 2 },
  escritorio: { width: 1280, height: 800, deviceScaleFactor: 2 },
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
    id: 'menu-reconocimiento-1280',
    title: 'Menú con «Reconocer voicings»',
    game: 'menu',
    viewport: 'escritorio',
    state: 'Menú recién abierto, juego de reconocimiento seleccionado, sin progreso guardado.',
  },
  {
    id: 'menu-rutas-1280',
    title: 'Menú con «Rutas II-V-I»',
    game: 'menu',
    viewport: 'escritorio',
    state: 'Menú con el juego de rutas seleccionado: solo Drop 2, modo y tramo, sin dificultad.',
  },
  {
    id: 'facil-pregunta-1280',
    title: 'Fácil: pregunta neutra',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta abierta en fácil: tarjeta con círculos grises y cuatro botones de acorde, sin nada elegido.',
  },
  {
    id: 'facil-correccion-1280',
    title: 'Fácil: error corregido',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta fácil verificada con un acorde equivocado: el elegido en rojo, el correcto en verde y la tarjeta con los colores musicales.',
  },
  {
    id: 'medio-pregunta-1280',
    title: 'Medio: acorde e inversión',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta abierta en medio: tarjeta neutra y los dos desplegables, Acorde e Inversión, sin elegir.',
  },
  {
    id: 'medio-correccion-1280',
    title: 'Medio: acierto parcial',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta medio verificada con el acorde correcto y la inversión equivocada: corrección campo por campo.',
  },
  {
    id: 'dificil-pregunta-1280',
    title: 'Difícil: colocar los grados',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta abierta en difícil: acorde e inversión elegidos, dos grados colocados sobre los círculos y el banco de fichas en gris.',
  },
  {
    id: 'dificil-correccion-1280',
    title: 'Difícil: corrección por campos',
    game: 'reconocimiento',
    viewport: 'escritorio',
    state: 'Pregunta difícil verificada con un solo grado equivocado: cinco campos correctos, uno incorrecto y la tarjeta con su solución.',
  },
  {
    id: 'ruta-pregunta-1280',
    title: 'Ruta: partida y candidata',
    game: 'rutas',
    viewport: 'escritorio',
    state: 'Pregunta de ruta abierta: la partida visible, una candidata neutra y el selector 1 a 4 con Verificar.',
  },
  {
    id: 'ruta-fallo-solucion-1280',
    title: 'Ruta: no es la de nuestra ruta, Solución',
    game: 'rutas',
    viewport: 'escritorio',
    state: 'Ruta verificada con otra candidata: selector bloqueado con la elegida en rojo y la de la ruta en verde, y la Solución en el comparador.',
  },
  {
    id: 'ruta-fallo-tu-respuesta-1280',
    title: 'Ruta: no es la de nuestra ruta, Tu respuesta',
    game: 'rutas',
    viewport: 'escritorio',
    state: 'La misma pregunta de ruta con «Tu respuesta» en el comparador: la candidata que se eligió.',
  },
  {
    id: 'progreso-detalle-1280',
    title: 'Progreso con el detalle de ambos juegos',
    game: 'progreso',
    viewport: 'escritorio',
    state: 'Panel «Tu progreso» tras jugar de verdad reconocimiento (fácil, medio y difícil) y rutas, con «Ver todo el detalle» abierto.',
  },
  {
    id: 'escritorio-menu-1280',
    title: 'Vista general en ordenador',
    game: 'menu',
    viewport: 'escritorio',
    state: 'Menú a 1280 px de ancho con el progreso de una pregunta verificada en cada juego.',
  },
  {
    id: 'menu-escalas-1280',
    title: 'Menú con «Reconocer patrones»',
    game: 'menu',
    viewport: 'escritorio',
    state: 'Menú con el juego de patrones: escala, tonalidad y dificultad, sin Drop ni set.',
  },
  {
    id: 'estudio-escalas-1280',
    title: 'Estudio de patrones de escala',
    game: 'estudio',
    viewport: 'escritorio',
    state: 'Modo estudio con «Patrones de escala»: los cinco patrones de una escala en una tonalidad, ordenados de grave a agudo.',
  },
  {
    id: 'patron-medio-pregunta-1280',
    title: 'Patrones, Medio: marcar las tónicas',
    game: 'escalas',
    viewport: 'escritorio',
    state: 'Pregunta de patrones en Medio: tarjeta neutra con trastes, patrón elegido y algunas tónicas marcadas.',
  },
  {
    id: 'patron-dificil-correccion-1280',
    title: 'Patrones, Difícil: corrección por grados',
    game: 'escalas',
    viewport: 'escritorio',
    state: 'Pregunta de patrones en Difícil verificada con una marca equivocada y otra sin poner: solución en color, corrección por grado y tus marcas con aros.',
  },
  {
    id: 'orden-pregunta-1280',
    title: 'Ordenar patrones: tarjetas sin trastes',
    game: 'escalas',
    viewport: 'escritorio',
    state: 'Pregunta de ordenar: cinco tarjetas neutras sin trastes ni cejuelo, dos ya colocadas.',
  },
  {
    id: 'orden-correccion-1280',
    title: 'Ordenar patrones: corrección',
    game: 'escalas',
    viewport: 'escritorio',
    state: 'Orden verificado con dos puestos intercambiados: corrección puesto a puesto y el orden correcto en color y con trastes.',
  },
]
