import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="widget">
      <h2 className="widget__title">Hello from React</h2>
      <p className="widget__description">
        This component is built in React and will be embedded in Webflow via a single <code>widget.js</code> file.
      </p>
      <div className="widget__counter">
        <button className="widget__btn" onClick={() => setCount(c => c - 1)}>−</button>
        <span className="widget__count">{count}</span>
        <button className="widget__btn" onClick={() => setCount(c => c + 1)}>+</button>
      </div>
      <p className="widget__hint">State, events, TypeScript — all working inside Webflow.</p>
    </div>
  )
}
