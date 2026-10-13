import { useEffect, useState } from 'react'

const read = () => (typeof window === 'undefined' ? '' : window.location.hash)

/** Ruta actual según el hash de la URL, por ejemplo «#/revision». Vacía en el inicio. */
export function useHashRoute(): string {
  const [hash, setHash] = useState(read)
  useEffect(() => {
    const update = () => setHash(read())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return hash
}
