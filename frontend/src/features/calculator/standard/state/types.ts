import type { BinaryOperation, ErrorCode, UnaryOperation } from '../../../../api/types'
import type { HistoryEntry } from '../../shared/types'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type Key =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'negate' }
  | { type: 'backspace' }
  | { type: 'clearEntry' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'equals' }
  | { type: 'unary'; operator: UnaryOperation }
  | { type: 'percent' }

export type CalculatorState = {
  /** Current value: the number being typed, or a full-precision result. */
  value: string
  /** typing: value is being typed; result: value was computed; awaitingOperand: an operator was just pressed. */
  entry: 'typing' | 'result' | 'awaitingOperand'
  /** Full-precision left-hand value of the pending operation. */
  accumulator: string | null
  pendingOperator: BinaryOperation | null
  /** Expression text of the left-hand value, e.g. "12" or "√(9)". */
  leftText: string
  /** Expression text of the current value when it came from a unary key, +/-, or %. */
  valueText: string | null
  /** Top display line. */
  expression: string
  /** Operator and right-hand operand of the last "=", for repeating it. */
  lastOperation: { operator: BinaryOperation; operand: string } | null
  /** The value is the result of "=". */
  justEvaluated: boolean
  status: 'ready' | 'loading' | 'error'
  errorCode: ErrorCode | null
  /** Completed "=" calculations, newest first. */
  history: HistoryEntry[]
}

export type { HistoryEntry }

export type CalculatorAction =
  | { type: 'KEY_PRESSED'; key: Key }
  | { type: 'CALCULATION_STARTED' }
  | { type: 'CALCULATION_SUCCEEDED'; key: Key; result: string }
  | { type: 'CALCULATION_FAILED'; code: ErrorCode }
  | { type: 'HISTORY_SELECTED'; entry: HistoryEntry }
  | { type: 'HISTORY_CLEARED' }
