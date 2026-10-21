import { CalculatorShell } from './features/calculator/CalculatorShell'
import { calculatorModes } from './features/calculator/modes'

function App() {
  return (
    <main>
      <h1 className="visually-hidden">Calculator</h1>
      <CalculatorShell modes={calculatorModes} />
    </main>
  )
}

export default App
