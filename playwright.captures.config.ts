import { defineConfig } from '@playwright/test'

// Capturas reales de los manuales (npm run docs:captures). Comando explícito: no forma parte de build, test, validate ni
// de la instalación, y no usa el webServer de playwright.config.ts. El spec construye la aplicación en un directorio
// temporal y la sirve con vite preview en un puerto libre, que cierra siempre al terminar. Solo Chromium, un único
// worker y en serie: las figuras comparten sesión para que el progreso sea el de las partidas jugadas.
export default defineConfig({
  testDir: 'captures',
  testMatch: '**/*.captures.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  timeout: 240_000,
  projects: [{ name: 'capturas', use: { browserName: 'chromium' } }],
})
