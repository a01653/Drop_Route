import { useId } from 'react'

export interface Option<T extends string> {
  id: T
  label: string
  detail?: string
  disabled?: boolean
}

interface OptionGroupProps<T extends string> {
  legend: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
}

/** Grupo de botones de elección única, con el estado en aria-pressed y áreas táctiles de 48 px o más. */
export function OptionGroup<T extends string>({ legend, options, value, onChange }: OptionGroupProps<T>) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{legend}</h2>
      <div className="opciones" role="group" aria-labelledby={titleId}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === value}
            disabled={option.disabled}
            onClick={() => onChange(option.id)}
          >
            <span>{option.label}</span>
            {option.detail && <small>{option.detail}</small>}
          </button>
        ))}
      </div>
    </section>
  )
}
