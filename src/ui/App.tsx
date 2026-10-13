import './app.css'
import { ReviewScreen } from './review/ReviewScreen'
import { StartScreen } from './StartScreen'
import { useHashRoute } from './useHashRoute'

export function App() {
  const route = useHashRoute()
  return route === '#/revision' ? <ReviewScreen /> : <StartScreen />
}
