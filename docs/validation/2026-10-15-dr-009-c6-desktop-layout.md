# Validación DR-009 — C6 y escritorio responsive

Fecha: 15/10/2026.

## Entrega validada

- Rama: `fix/c6-desktop-layout`.
- Commit funcional validado: `d9c2d6951c1353e4e9193d6b8e10ff25366a7407`.
- GitHub Actions: ejecución `38707724976`.
- Resultado: `foundation` y `app` correctos.

## Comprobaciones

- `data:check` y `audit:music`: correctos; no se reescriben los JSON de catálogo o rutas.
- `test:base`: correcto.
- `typecheck` y `lint`: correctos.
- Vitest: 24 archivos, 293 pruebas correctas.
- Build de producción: correcto.
- Playwright E2E: correcto en los proyectos de escritorio y móvil.
- Capturas de documentación: correctas y artefacto generado.
- `docs:check` y `docs:check:final`: correctos.

## Regresiones cubiertas

- La 3ª inversión de Cmaj7 en modo estudio muestra `Cmaj7 – C6`, baja la voz de 7ª dos trastes y la rotula como 6.
- La variante se transpone, por ejemplo, a `Dmaj7 – D6`.
- Las rutas con `sourceOptionalSubstitution: "C6"` muestran la misma forma derivada.
- A 1440×900, menú y reconocimiento usan dos zonas horizontales y el modo estudio separa controles y contenido en columnas.
- Las pruebas móviles existentes a 360, 390 y 430 px continúan correctas, sin desplazamiento horizontal.

La primera ejecución de la rama (`38707265953`) detectó que la regla base de `study.css` podía imponerse al grid de escritorio por orden de empaquetado. Se elevó la especificidad del selector de escritorio y la repetición completa (`38707724976`) terminó verde.
