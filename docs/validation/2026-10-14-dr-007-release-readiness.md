# Validación de DR-007: cierre documental y preparación de publicación

Fecha: 15/10/2026. Rama de entrega: `feat/progress-and-pwa`.

La CI anterior del candidato DR-006, ejecución `38588437353` sobre `eb1bbbe6c472fadd3e360634278ae916c76a68ba`, terminó correctamente en `foundation` y `app`: datos, auditoría musical, tests de base, typecheck, lint, unitarias, build, E2E y generación de las capturas de los manuales.

DR-007 incorpora las 13 capturas reales producidas por esa ejecución y su `capturas.json`, regenera el DTS y genera los manuales de uso e instalación en LaTeX/PDF. La política documental queda en `required`.

## Comprobaciones de cierre

- `npm run docs:build`: correcto.
- `npm run docs:check`: correcto.
- `npm run docs:check:final`: correcto.
- `DROP_ROUTE_BASE=/Drop_Route/ npm run build`: correcto.
- Los dos manuales se revisaron visualmente antes de integrar la entrega.

## GitHub Pages

`.github/workflows/deploy-pages.yml` usa trabajos separados `build` y `deploy`, `upload-pages-artifact@v4` y `deploy-pages@v4`, siguiendo el esquema de `a01653/mastil_escalas`. Drop Route usa Node desde `.nvmrc`, `npm ci --ignore-scripts` y base `/Drop_Route/`.

La dirección prevista es `https://a01653.github.io/Drop_Route/`. Si GitHub Pages todavía no está activado con origen **GitHub Actions**, hay que hacerlo una vez en la configuración del repositorio.
