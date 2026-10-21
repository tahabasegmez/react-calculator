import { ScientificCalculator } from './scientific/ScientificCalculator'
import type { CalculatorMode } from './shared/mode'
import { StandardCalculator } from './standard/StandardCalculator'

/** All calculator modes, in menu order. The first one is shown on start. */
export const calculatorModes: CalculatorMode[] = [
  { id: 'standard', label: 'Standard', Component: StandardCalculator },
  { id: 'scientific', label: 'Scientific', Component: ScientificCalculator },
]
