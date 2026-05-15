import { useState } from 'react'
import { useWebflowData } from './useWebflowData'

interface Spec {
  label: string
  value: string
}

export default function App() {
  const data = useWebflowData('react-root', {
    name: 'Douglas Fir Profile 120×18',
    description: 'Durable softwood ideal for cladding and decking. Available in multiple lengths.',
    color: '#2d5a2d',
    specs: [
      { label: 'Width', value: '120 mm' },
      { label: 'Thickness', value: '18 mm' },
      { label: 'Length', value: '4000 mm' },
      { label: 'Strength class', value: 'C24' },
    ] as Spec[],
  })

  const [requested, setRequested] = useState(false)

  return (
    <div className="widget">
      <div className="widget__header" style={{ borderLeftColor: data.color as string }}>
        <h2 className="widget__name">{data.name as string}</h2>
        <span className="widget__badge" style={{ background: data.color as string }}>
          In stock valya
        </span>
      </div>

      <p className="widget__description">{data.description as string}</p>

      <table className="widget__specs">
        <tbody>
          {(data.specs as Spec[]).map(spec => (
            <tr key={spec.label} className="widget__spec-row">
              <td className="widget__spec-label">{spec.label}</td>
              <td className="widget__spec-value">{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className={`widget__cta${requested ? ' is-done' : ''}`}
        style={requested ? undefined : { background: data.color as string }}
        onClick={() => setRequested(true)}
      >
        {requested ? '✓ Quote requested' : 'Request quote'}
      </button>
    </div>
  )
}
