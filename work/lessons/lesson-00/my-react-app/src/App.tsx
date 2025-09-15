import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState<number>(0)
  const [name, setName] = useState<string>('')

  return (
    <div className="custom-container">
      <header className="App-header">
        <h1>Welcome to My React App - PP</h1>
        <input
        type="text"
        placeholder="Type your name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
        <p>Hello, {name || "stranger"}!</p>
        <button onClick={() => setCount(count + 1)}>
          Count: {count}
        </button>
      </header>
    </div>
  )
}

export default App