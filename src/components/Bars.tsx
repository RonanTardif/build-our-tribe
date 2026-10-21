export type BarItem = {
  key: string
  label: string
  value: number
  caption?: string
  details?: string[]
}

const MAX_DETAILS = 4

export function Bars({ items, unit }: { items: BarItem[]; unit: (value: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ol className="bars">
      {items.map((item, index) => (
        <li key={item.key} className={`bar ${item.value === 0 ? 'bar--zero' : ''}`}>
          <div className="bar__head">
            <span className="bar__rank">{index + 1}</span>
            <span className="bar__label">{item.label}</span>
            <span className="bar__value">{unit(item.value)}</span>
          </div>
          <div className="bar__track">
            <div className="bar__fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          {item.caption && <div className="bar__caption">{item.caption}</div>}
          {item.details && item.details.length > 0 && (
            <ul className="bar__details">
              {item.details.slice(0, MAX_DETAILS).map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
              {item.details.length > MAX_DETAILS && <li>+ {item.details.length - MAX_DETAILS} autres</li>}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
