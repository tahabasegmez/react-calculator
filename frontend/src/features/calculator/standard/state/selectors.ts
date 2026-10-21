import type { ErrorCode } from '../../../../api/types'
import { formatInput, formatResult } from '../../../../utils/format'
import type { CalculatorState, Key } from './types'

const errorTexts: Partial<Record<ErrorCode, string>> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero',
  UNDEFINED_RESULT: 'Result is undefined',
  INVALID_DOMAIN: 'Invalid input',
  OVERFLOW: 'Overflow',
  NETWORK_ERROR: 'Service unavailable',
}

export function errorText(code: ErrorCode | null): string {
  return (code && errorTexts[code]) ?? 'Something went wrong'
}

/** The value line: the error text, the number being typed, or a formatted result. */
export function selectDisplay(state: CalculatorState): string {
  if (state.status === 'error') {
    return errorText(state.errorCode)
  }
  return state.entry === 'typing' ? formatInput(state.value) : formatResult(state.value)
}

const errorExitKeys: ReadonlySet<Key['type']> = new Set([
  'digit',
  'clear',
  'clearEntry',
  'backspace',
])

/** All keys are disabled during a request; only C, CE, ⌫, and digits work in the error state. */
export function isKeyDisabled(state: CalculatorState, key: Key): boolean {
  if (state.status === 'loading') {
    return true
  }
  return state.status === 'error' && !errorExitKeys.has(key.type)
}
