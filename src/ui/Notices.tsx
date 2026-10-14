import type { NoticeKind } from '../progress'

const STORAGE_NOTICES: Record<NoticeKind, { title: string; text: string }> = {
  unavailable: {
    title: 'Este navegador no deja guardar datos',
    text: 'Puedes jugar con normalidad, pero tu progreso y tu configuración solo duran mientras la página siga abierta.',
  },
  'write-failed': {
    title: 'No se ha podido guardar tu progreso',
    text: 'El almacenamiento del dispositivo está lleno o bloqueado. Puedes seguir jugando: lo que llevas queda en esta página y se intentará guardar de nuevo con tu próxima respuesta. Si la cierras antes, se perderá.',
  },
  damaged: {
    title: 'Tu progreso guardado estaba dañado',
    text: 'No se ha podido leer, así que empiezas de cero. Se ha guardado una copia del dato dañado en este dispositivo.',
  },
  'damaged-uncopied': {
    title: 'Tu progreso guardado está dañado',
    text: 'No se ha podido leer y tampoco copiar. Empiezas de cero en memoria y, para no perder el dato dañado, en esta sesión no se guardará nada: se perderá lo que juegues al cerrar la página.',
  },
  repaired: {
    title: 'Parte de tu progreso guardado no era válida',
    text: 'Se ha descartado lo que no se podía leer y se conserva el resto. Se ha guardado una copia del original en este dispositivo.',
  },
  'repaired-uncopied': {
    title: 'Parte de tu progreso guardado no era válida',
    text: 'Se ha descartado lo que no se podía leer y se usa el resto, pero no se ha podido guardar una copia del original. Para no perderlo, en esta sesión no se guardará nada: lo que juegues se perderá al cerrar la página.',
  },
  'migration-uncopied': {
    title: 'Tu progreso es de un formato anterior',
    text: 'Se ha leído y se usa en esta página, pero no se ha podido guardar una copia del original antes de actualizarlo. Para no perderlo, en esta sesión no se guardará nada: lo que juegues se perderá al cerrar la página.',
  },
  future: {
    title: 'Tu progreso es de una versión más reciente',
    text: 'Lo guardó una versión más nueva de Drop Route y no se puede leer aquí. Se conserva sin tocar: en esta sesión no se guardará nada para no sobrescribirlo.',
  },
}

interface NoticesProps {
  storage: NoticeKind | null
  onDismiss: () => void
  /** Hay una versión nueva lista y la persona está en el menú: solo allí se ofrece, nunca con una pregunta abierta. */
  update: boolean
  onUpdate: () => void
  /** Lo que hay en la página no está guardado en el dispositivo: actualizar, que recarga, lo perdería. */
  unsaved: boolean
}

/** Avisos sobre el almacenamiento y las actualizaciones. Sin avisos no pinta nada. */
export function Notices({ storage, onDismiss, update, onUpdate, unsaved }: NoticesProps) {
  if (!storage && !update) return null
  const notice = storage ? STORAGE_NOTICES[storage] : null
  return (
    <div className="avisos">
      {notice && (
        <section className="aviso" role="status" aria-label="Aviso sobre el almacenamiento">
          <h2>{notice.title}</h2>
          <p>{notice.text}</p>
          {(storage === 'damaged' || storage === 'repaired') && (
            <button className="boton-secundario" type="button" onClick={onDismiss}>
              Entendido
            </button>
          )}
        </section>
      )}
      {update && (
        <section className="aviso informa" role="status" aria-label="Aviso de actualización">
          <h2>Hay una versión nueva de Drop Route</h2>
          {unsaved ? (
            <p>
              Está descargada y lista, pero ahora mismo lo que llevas en esta página (tu configuración y el progreso de
              esta sesión) no está guardado en el dispositivo. Si actualizas, la página se recarga y se perderá. Puedes
              seguir jugando sin actualizar.
            </p>
          ) : (
            <p>Está descargada y lista. Al actualizar se recarga la página; tu progreso y tu configuración se conservan.</p>
          )}
          <button className={unsaved ? 'boton-secundario' : 'boton-principal'} type="button" onClick={onUpdate}>
            {unsaved ? 'Actualizar y perder lo no guardado' : 'Actualizar ahora'}
          </button>
        </section>
      )}
    </div>
  )
}
