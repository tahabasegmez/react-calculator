import type { BinaryOperation, CalculationRequest, UnaryOperation } from '../../../api/types'
import { formatResult } from '../../../utils/format'
import { isKeyDisabled } from './selectors'
import type { CalculatorAction, CalculatorState, Digit, Key } from './types'

const MAX_DIGITS = 16

const symbols: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
}

const unaryText: Record<UnaryOperation, (operand: string) => string> = {
  sqrt: (operand) => `√(${operand})`,
  square: (operand) => `sqr(${operand})`,
  reciprocal: (operand) => `1/(${operand})`,
}

export const initialState: CalculatorState = {
  value: '0',
  entry: 'typing',
  accumulator: null,
  pendingOperator: null,
  leftText: '',
  valueText: null,
  expression: '',
  lastOperation: null,
  justEvaluated: false,
  status: 'ready',
  errorCode: null,
  history: [],
}

// Resets the calculator but keeps the history.
const reset = (state: CalculatorState): CalculatorState => ({
  ...initialState,
  history: state.history,
})

// The outcome of a key: either a new state, or a backend request plus how to apply its result.
type Step =
  | { kind: 'local'; state: CalculatorState }
  | { kind: 'request'; request: CalculationRequest; complete: (result: string) => CalculatorState }

const local = (state: CalculatorState): Step => ({ kind: 'local', state })

/** Returns the backend request a key needs, or null if the reducer handles it alone. */
export function planRequest(state: CalculatorState, key: Key): CalculationRequest | null {
  if (isKeyDisabled(state, key)) {
    return null
  }
  const step = keyStep(state, key)
  return step.kind === 'request' ? step.request : null
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'KEY_PRESSED': {
      const { key } = action
      if (isKeyDisabled(state, key)) {
        return state
      }
      if (state.status === 'error') {
        return key.type === 'digit' ? inputDigit(reset(state), key.digit) : reset(state)
      }
      const step = keyStep(state, key)
      return step.kind === 'local' ? step.state : state
    }
    case 'CALCULATION_STARTED':
      return { ...state, status: 'loading' }
    case 'CALCULATION_SUCCEEDED': {
      const ready = { ...state, status: 'ready' as const }
      const step = keyStep(ready, action.key)
      return step.kind === 'request' ? step.complete(action.result) : ready
    }
    case 'CALCULATION_FAILED':
      return { ...state, status: 'error', errorCode: action.code }
    case 'HISTORY_SELECTED':
      if (state.status === 'loading') {
        return state
      }
      return {
        ...reset(state),
        value: action.entry.result,
        entry: 'result',
        expression: action.entry.expression,
        justEvaluated: true,
      }
    case 'HISTORY_CLEARED':
      return { ...state, history: [] }
  }
}

function keyStep(state: CalculatorState, key: Key): Step {
  switch (key.type) {
    case 'digit':
      return local(inputDigit(state, key.digit))
    case 'decimal':
      return local(inputDecimal(state))
    case 'backspace':
      return local(backspace(state))
    case 'clearEntry':
      return local(clearEntry(state))
    case 'clear':
      return local(reset(state))
    case 'negate':
      return local(negate(state))
    case 'operator':
      return operator(state, key.operator)
    case 'equals':
      return equals(state)
    case 'unary':
      return unary(state, key.operator)
    case 'percent':
      return percent(state)
  }
}

// Expression text of the current value.
const valueText = (state: CalculatorState) => state.valueText ?? formatResult(state.value)

// Expression text of the pending left operand and operator, e.g. "5 +".
const pendingText = (state: CalculatorState) =>
  state.pendingOperator ? `${state.leftText} ${symbols[state.pendingOperator]}` : ''

const join = (...parts: string[]) => parts.filter(Boolean).join(' ')

function startNumber(state: CalculatorState, value: string): CalculatorState {
  return {
    ...state,
    value,
    entry: 'typing',
    valueText: null,
    justEvaluated: false,
    expression: pendingText(state),
  }
}

function countDigits(typed: string): number {
  const [intPart, fracPart = ''] = typed.replace('-', '').split('.')
  return (intPart === '0' ? 0 : intPart.length) + fracPart.length
}

function inputDigit(state: CalculatorState, digit: Digit): CalculatorState {
  if (state.entry !== 'typing') {
    return startNumber(state, digit)
  }
  if (state.value === '0') {
    return { ...state, value: digit }
  }
  if (countDigits(state.value) >= MAX_DIGITS) {
    return state
  }
  return { ...state, value: state.value + digit }
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.entry !== 'typing') {
    return startNumber(state, '0.')
  }
  if (state.value.includes('.')) {
    return state
  }
  return { ...state, value: state.value + '.' }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.entry === 'typing') {
    const next = state.value.slice(0, -1)
    return { ...state, value: next === '' || next === '-' || next === '-0' ? '0' : next }
  }
  return state.justEvaluated ? { ...state, expression: '' } : state
}

function clearEntry(state: CalculatorState): CalculatorState {
  return {
    ...startNumber(state, '0'),
    lastOperation: state.justEvaluated ? null : state.lastOperation,
  }
}

const toggleSign = (value: string) => (value.startsWith('-') ? value.slice(1) : '-' + value)

function negate(state: CalculatorState): CalculatorState {
  if (state.entry === 'typing') {
    return state.value === '0' ? state : { ...state, value: toggleSign(state.value) }
  }
  const text = `negate(${valueText(state)})`
  return {
    ...state,
    value: state.value === '0' ? '0' : toggleSign(state.value),
    entry: 'result',
    valueText: text,
    justEvaluated: false,
    expression: join(pendingText(state), text),
  }
}

function withOperator(state: CalculatorState, left: string, leftText: string, op: BinaryOperation) {
  return {
    ...state,
    value: left,
    entry: 'awaitingOperand' as const,
    accumulator: left,
    pendingOperator: op,
    leftText,
    valueText: null,
    justEvaluated: false,
    expression: `${leftText} ${symbols[op]}`,
  }
}

function operator(state: CalculatorState, op: BinaryOperation): Step {
  const pending = state.pendingOperator
  if (pending === null) {
    return local(withOperator(state, state.value, valueText(state), op))
  }
  if (state.entry === 'awaitingOperand') {
    return local({ ...state, pendingOperator: op, expression: `${state.leftText} ${symbols[op]}` })
  }
  return {
    kind: 'request',
    request: { operation: pending, operands: [state.accumulator!, state.value] },
    complete: (result) => withOperator(state, result, formatResult(result), op),
  }
}

function evaluated(
  state: CalculatorState,
  result: string,
  expression: string,
  lastOperation: CalculatorState['lastOperation'],
): CalculatorState {
  return {
    ...state,
    value: result,
    entry: 'result',
    accumulator: null,
    pendingOperator: null,
    leftText: '',
    valueText: null,
    expression,
    lastOperation,
    justEvaluated: true,
    history: [{ expression, result }, ...state.history],
  }
}

function equals(state: CalculatorState): Step {
  const pending = state.pendingOperator
  if (pending !== null) {
    const operand = state.value
    return {
      kind: 'request',
      request: { operation: pending, operands: [state.accumulator!, operand] },
      complete: (result) =>
        evaluated(state, result, `${pendingText(state)} ${valueText(state)} =`, {
          operator: pending,
          operand,
        }),
    }
  }
  const last = state.lastOperation
  if (last !== null) {
    return {
      kind: 'request',
      request: { operation: last.operator, operands: [state.value, last.operand] },
      complete: (result) =>
        evaluated(
          state,
          result,
          `${valueText(state)} ${symbols[last.operator]} ${formatResult(last.operand)} =`,
          last,
        ),
    }
  }
  return local({
    ...state,
    entry: 'result',
    valueText: null,
    justEvaluated: true,
    expression: `${valueText(state)} =`,
  })
}

function withValueText(state: CalculatorState, result: string, text: string): CalculatorState {
  return {
    ...state,
    value: result,
    entry: 'result',
    valueText: text,
    justEvaluated: false,
    expression: join(pendingText(state), text),
  }
}

function unary(state: CalculatorState, op: UnaryOperation): Step {
  return {
    kind: 'request',
    request: { operation: op, operands: [state.value] },
    complete: (result) => withValueText(state, result, unaryText[op](valueText(state))),
  }
}

function percent(state: CalculatorState): Step {
  const pending = state.pendingOperator
  const request: CalculationRequest =
    pending === 'add' || pending === 'subtract'
      ? { operation: 'percent_of', operands: [state.accumulator!, state.value] }
      : { operation: 'percent', operands: [state.value] }
  return {
    kind: 'request',
    request,
    complete: (result) => withValueText(state, result, formatResult(result)),
  }
}
