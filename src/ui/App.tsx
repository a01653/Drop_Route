import { useState, useSyncExternalStore } from 'react'
import { createAppStore, isMemoryOnly } from '../progress'
import type { AppStore } from '../progress'
import './app.css'
import './game/game.css'
import { MenuScreen } from './game/MenuScreen'
import { RecognitionScreen } from './game/RecognitionScreen'
import { RouteScreen } from './game/RouteScreen'
import { Notices } from './Notices'
import { NO_UPDATES } from './pwa/update'
import type { UpdateController } from './pwa/update'
import { ReviewScreen } from './review/ReviewScreen'
import { useHashRoute } from './useHashRoute'

/** Semilla de una pregunta nueva: el azar de producción vive aquí, no en la sesión. */
const newSeed = () => Math.floor(Math.random() * 2 ** 32)

export interface AppProps {
  /** Sesión, contadores y persistencia. Sin él, la aplicación juega en memoria (pruebas y renderizado sin navegador). */
  store?: AppStore
  /** Versiones nuevas del service worker. Sin él, no hay avisos de actualización. */
  pwa?: UpdateController
}

export function App({ store: provided, pwa = NO_UPDATES }: AppProps) {
  const route = useHashRoute()
  const [store] = useState(() => provided ?? createAppStore())
  const { session, progress, notice } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const updateReady = useSyncExternalStore(pwa.subscribe, pwa.getSnapshot, pwa.getSnapshot)
  const dispatch = store.dispatch

  if (route === '#/revision') return <ReviewScreen />

  const screen =
    session.phase === 'menu' ? (
      <MenuScreen state={session} dispatch={dispatch} newSeed={newSeed} progress={progress} />
    ) : session.phase === 'ruta' || session.phase === 'ruta-verificada' ? (
      <RouteScreen state={session} dispatch={dispatch} newSeed={newSeed} />
    ) : (
      <RecognitionScreen state={session} dispatch={dispatch} newSeed={newSeed} />
    )

  return (
    <>
      <Notices
        storage={notice}
        onDismiss={store.dismissNotice}
        update={updateReady && session.phase === 'menu'}
        onUpdate={pwa.apply}
        unsaved={isMemoryOnly(notice)}
      />
      {screen}
    </>
  )
}
