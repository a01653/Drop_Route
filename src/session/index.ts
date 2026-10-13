// Capa de sesión. En DR-001 solo existe la fase de arranque; la pregunta,
// la selección, la verificación y el regreso al menú llegan con los juegos.
// No depende de React, así que se puede probar sin DOM.

export type SessionPhase = 'arranque'

export interface SessionState {
  readonly phase: SessionPhase
}

export function createSession(): SessionState {
  return { phase: 'arranque' }
}
