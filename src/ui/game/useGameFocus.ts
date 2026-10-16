import { useEffect, useRef } from 'react'

/** Mantiene el foco accesible y muestra la corrección con su acción siguiente. */
export function useGameFocus(questionNumber: number, verified: boolean) {
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const resultPanel = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!verified) {
      questionHeading.current?.focus()
      return
    }

    resultHeading.current?.focus({ preventScroll: true })
    const panel = resultPanel.current
    if (!panel) return
    const frame = requestAnimationFrame(() => {
      const style = getComputedStyle(panel)
      const marginTop = parseFloat(style.scrollMarginTop)
      const marginBottom = parseFloat(style.scrollMarginBottom)
      const viewport = window.visualViewport
      const top = (viewport?.offsetTop ?? 0) + marginTop
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - marginBottom
      const bounds = panel.getBoundingClientRect()
      // Una corrección larga empieza por el título. Si cabe, basta desplazar
      // lo necesario para mostrar también Siguiente, sin ocultar el resultado.
      const shift = bounds.height > bottom - top || bounds.top < top
        ? bounds.top - top
        : Math.max(0, bounds.bottom - bottom)
      if (shift) window.scrollBy({ top: shift, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [questionNumber, verified])

  return { questionHeading, resultHeading, resultPanel }
}
