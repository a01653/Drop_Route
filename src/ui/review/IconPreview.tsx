import iconUrl from '../../../assets/icon/drop-route-icon.svg'

// Las exportaciones PNG se enseñan a tamaño real: 32 px es el límite de legibilidad exigido.
const exports = import.meta.glob<string>('../../../assets/icon/exports/icon-{16,32,48,64,128}.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const sizes = Object.entries(exports)
  .map(([path, url]) => ({ size: Number(/icon-(\d+)\.png$/.exec(path)?.[1]), url }))
  .sort((a, b) => a.size - b.size)

export function IconPreview() {
  return (
    <section className="revision-icono" aria-labelledby="icono-titulo">
      <h2 id="icono-titulo">Icono</h2>
      <p>
        Original editable en SVG y exportaciones PNG a tamaño real, sobre fondo claro y oscuro. A 32 px deben
        distinguirse los cuatro círculos.
      </p>
      <img className="icono-original" src={iconUrl} width={128} height={128} alt="Icono de Drop Route, original SVG" />
      {(['claro', 'oscuro'] as const).map((fondo) => (
        <div className={`icono-panel icono-panel-${fondo}`} key={fondo}>
          {sizes.map(({ size, url }) => (
            <img key={size} src={url} width={size} height={size} alt={`Icono de ${size} píxeles sobre fondo ${fondo}`} />
          ))}
        </div>
      ))}
    </section>
  )
}
