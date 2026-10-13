import { defineConfig, devices } from '@playwright/test'

const port = 4173

// Las pruebas se ejecutan contra el build servido por vite preview. El build
// se genera siempre antes de levantar el servidor y nunca se reutiliza uno
// existente: si el puerto está ocupado, Playwright falla en lugar de probar un
// servidor con una compilación anterior. El humo comprueba además que dist/ es
// posterior a este instante, fijado una sola vez por el proceso principal y
// heredado por los workers.
process.env.DROP_ROUTE_E2E_STARTED_AT ??= String(Date.now())

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
