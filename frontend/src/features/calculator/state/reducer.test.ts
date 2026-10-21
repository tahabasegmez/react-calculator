import { describe, expect, it } from 'vitest'
import type { CalculationRequest, ErrorCode } from '../../../api/types'
import { calculatorReducer, initialState, planRequest } from './reducer'
import { selectDisplay } from './selectors'
import type { CalculatorState, Digit, Key } from './types'

// Token shorthand: digits and "." expand per character; other tokens name one key.
const namedKeys: Record<string, Key> = {
  '+': { type: 'operator', operator: 'add' },
  '-': { type: 'operator', operator: 'subtract' },
  '*': { type: 'operator', operator: 'multiply' },
  '/': { type: 'operator', operator: 'divide' },
  '=': { type: 'equals' },
  '%': { type: 'percent' },
  sqrt: { type: 'unary', operator: 'sqrt' },
  sqr: { type: 'unary', operator: 'square' },
  inv: { type: 'unary', operator: 'reciprocal' },
  neg: { type: 'negate' },
  back: { type: 'backspace' },
  CE: { type: 'clearEntry' },
  C: { type: 'clear' },
}

function keys(sequence: string): Key[] {
  return sequence
    .split(' ')
    .filter(Boolean)
    .flatMap((token) =>
      /^[\d.]+$/.test(token)
        ? token
            .split('')
            .map((c): Key =>
              c === '.' ? { type: 'decimal' } : { type: 'digit', digit: c as Digit },
            )
        : [namedKeys[token]],
    )
}

type Run = { state: CalculatorState; requests: CalculationRequest[] }

/** Presses keys like the hook does; each request is answered with the next backend result. */
function run(sequence: string, results: string[] = [], from: CalculatorState = initialState): Run {
  const queue = [...results]
  const requests: CalculationRequest[] = []
  let state = from
  for (const key of keys(sequence)) {
    const request = planRequest(state, key)
    if (request === null) {
      state = calculatorReducer(state, { type: 'KEY_PRESSED', key })
      continue
    }
    requests.push(request)
    const result = queue.shift()
    if (result === undefined) {
      throw new Error(`no backend result left for ${JSON.stringify(request)}`)
    }
    state = calculatorReducer(state, { type: 'CALCULATION_STARTED' })
    state = calculatorReducer(state, { type: 'CALCULATION_SUCCEEDED', key, result })
  }
  expect(queue).toEqual([])
  return { state, requests }
}

function failWith(code: ErrorCode, from: CalculatorState): CalculatorState {
  return calculatorReducer(from, { type: 'CALCULATION_FAILED', code })
}

function expectScreen(state: CalculatorState, expression: string, display: string) {
  expect({ expression: state.expression, display: selectDisplay(state) }).toEqual({
    expression,
    display,
  })
}

describe('input', () => {
  it('replaces a leading 0 with the typed digit', () => {
    expectScreen(run('0 5').state, '', '5')
  })

  it('starts with 0. when "." is pressed on empty input', () => {
    expectScreen(run('.').state, '', '0.')
  })

  it('ignores a second "."', () => {
    expectScreen(run('1 . 2 .').state, '', '1.2')
  })

  it('ignores digits after 16 entered digits', () => {
    expectScreen(run('1234567890123456 7').state, '', '1,234,567,890,123,456')
  })

  it('does not count the leading 0 before the decimal point', () => {
    expectScreen(run('0.1234567890123456 7').state, '', '0.1234567890123456')
  })

  it('shows thousands separators while typing', () => {
    expectScreen(run('1234.50').state, '', '1,234.50')
  })

  it('starts a new number after "="', () => {
    const { state } = run('5 + 3 = 7', ['8'])
    expectScreen(state, '', '7')
  })

  it('starts a new number after a unary result', () => {
    expectScreen(run('9 sqrt 4', ['3']).state, '', '4')
  })

  it('starts a new number after a chained result', () => {
    expectScreen(run('5 + 3 * 2', ['8']).state, '8 ×', '2')
  })

  it('starts a new number 0. when "." follows a computed result', () => {
    expectScreen(run('5 + 3 = .', ['8']).state, '', '0.')
  })

  it.each([
    ['123 back', '12'],
    ['1.5 back', '1.'],
    ['5 back', '0'],
    ['5 neg back', '0'],
    ['0. back', '0'],
    ['. neg back', '0'],
  ])('deletes the last typed character: %s → %s', (sequence, display) => {
    expectScreen(run(sequence).state, '', display)
  })

  it('keeps a result on backspace and clears the expression after "="', () => {
    expectScreen(run('5 + 3 = back', ['8']).state, '', '8')
  })

  it('keeps a unary result and its expression on backspace', () => {
    expectScreen(run('9 sqrt back', ['3']).state, '√(9)', '3')
  })

  it('clears the second operand with CE and keeps the pending expression', () => {
    expectScreen(run('5 + 3 CE').state, '5 +', '0')
  })

  it('clears the result, the expression, and the last operation with CE after "="', () => {
    const { state, requests } = run('5 + 3 = CE =', ['8'])
    expect(requests).toHaveLength(1)
    expectScreen(state, '0 =', '0')
  })

  it('resets everything with C', () => {
    expect(run('5 + 3 C').state).toEqual(initialState)
  })
})

describe('binary operators and "="', () => {
  it('replaces an operator pressed right after another operator', () => {
    const { state, requests } = run('5 + *')
    expect(requests).toEqual([])
    expectScreen(state, '5 ×', '5')
  })

  it('computes the pending operation when an operator follows a second operand', () => {
    const { state, requests } = run('5 + 3 *', ['8'])
    expect(requests).toEqual([{ operation: 'add', operands: ['5', '3'] }])
    expectScreen(state, '8 ×', '8')
  })

  it('uses immediate execution without precedence', () => {
    const { state, requests } = run('2 + 3 * 4 =', ['5', '20'])
    expect(requests).toEqual([
      { operation: 'add', operands: ['2', '3'] },
      { operation: 'multiply', operands: ['5', '4'] },
    ])
    expectScreen(state, '5 × 4 =', '20')
  })

  it('uses the result as the left operand when an operator follows "="', () => {
    const { state, requests } = run('5 + 3 = +', ['8'])
    expect(requests).toHaveLength(1)
    expectScreen(state, '8 +', '8')
  })

  it('uses the current value as the second operand when "=" follows an operator', () => {
    const { state, requests } = run('5 + =', ['10'])
    expect(requests).toEqual([{ operation: 'add', operands: ['5', '5'] }])
    expectScreen(state, '5 + 5 =', '10')
  })

  it('applies the last operation to a new value', () => {
    const { state, requests } = run('5 + 3 = 7 =', ['8', '10'])
    expect(requests[1]).toEqual({ operation: 'add', operands: ['7', '3'] })
    expectScreen(state, '7 + 3 =', '10')
  })

  it('repeats the last operation on repeated "="', () => {
    const { state, requests } = run('5 + 3 = = =', ['8', '11', '14'])
    expect(requests).toEqual([
      { operation: 'add', operands: ['5', '3'] },
      { operation: 'add', operands: ['8', '3'] },
      { operation: 'add', operands: ['11', '3'] },
    ])
    expectScreen(state, '11 + 3 =', '14')
  })

  it('shows "5 =" without a request when there is nothing to calculate', () => {
    const { state, requests } = run('5 =')
    expect(requests).toEqual([])
    expectScreen(state, '5 =', '5')
  })

  it('sends the full-precision value, not the displayed one', () => {
    const third = '0.3333333333333333333333333333333333'
    const { requests } = run('1 inv * 3 =', [third, '1'])
    expect(requests[1]).toEqual({ operation: 'multiply', operands: [third, '3'] })
  })
})

describe('unary operations and sign', () => {
  it.each([
    ['9 sqrt', 'sqrt', '√(9)', '3'],
    ['5 sqr', 'square', 'sqr(5)', '25'],
    ['5 inv', 'reciprocal', '1/(5)', '0.2'],
  ])('applies %s to the current value', (sequence, operation, expression, result) => {
    const { state, requests } = run(sequence, [result])
    expect(requests).toEqual([{ operation, operands: [sequence.split(' ')[0]] }])
    expectScreen(state, expression, result)
  })

  it('nests unary expressions', () => {
    const { state, requests } = run('5 sqr sqrt', ['25', '5'])
    expect(requests[1]).toEqual({ operation: 'sqrt', operands: ['25'] })
    expectScreen(state, '√(sqr(5))', '5')
  })

  it('applies a unary key right after an operator to the current value as second operand', () => {
    const root5 = '2.236067977499789696409173668731276'
    const { state, requests } = run('5 + sqrt =', [root5, '7.236067977499789696409173668731276'])
    expect(requests).toEqual([
      { operation: 'sqrt', operands: ['5'] },
      { operation: 'add', operands: ['5', root5] },
    ])
    expectScreen(state, '5 + √(5) =', '7.23606797749979')
  })

  it('shows the unary expression of the second operand', () => {
    expectScreen(run('5 + sqrt', ['2.236']).state, '5 + √(5)', '2.236')
  })

  it('negates the current value as second operand right after an operator', () => {
    const { state, requests } = run('5 + neg')
    expect(requests).toEqual([])
    expectScreen(state, '5 + negate(5)', '-5')
    expect(run('5 + neg =', ['0']).requests).toEqual([{ operation: 'add', operands: ['5', '-5'] }])
  })

  it('negates a chained result as the second operand', () => {
    expectScreen(run('5 + 3 * neg', ['8']).state, '8 × negate(8)', '-8')
  })

  it('wraps a unary result in negate()', () => {
    expectScreen(run('9 sqrt neg', ['3']).state, 'negate(√(9))', '-3')
  })

  it.each([
    ['200 + 10 %', ['200', '10'], '20', '200 + 20'],
    ['200 - 10 %', ['200', '10'], '20', '200 − 20'],
    ['200 + %', ['200', '200'], '400', '200 + 400'],
  ])('uses percent_of with a pending + or −: %s', (sequence, operands, result, expression) => {
    const { state, requests } = run(sequence, [result])
    expect(requests).toEqual([{ operation: 'percent_of', operands }])
    expectScreen(state, expression, result)
  })

  it.each([
    ['200 * 10 %', '200 × 0.1'],
    ['200 / 10 %', '200 ÷ 0.1'],
  ])('uses percent with a pending × or ÷: %s', (sequence, expression) => {
    const { state, requests } = run(sequence, ['0.1'])
    expect(requests).toEqual([{ operation: 'percent', operands: ['10'] }])
    expectScreen(state, expression, '0.1')
  })

  it('uses percent without a pending operator', () => {
    const { state, requests } = run('10 %', ['0.1'])
    expect(requests).toEqual([{ operation: 'percent', operands: ['10'] }])
    expectScreen(state, '0.1', '0.1')
  })
})

describe('+/-', () => {
  it('toggles the sign of the number being typed', () => {
    expectScreen(run('5 neg').state, '', '-5')
    expectScreen(run('5 neg neg').state, '', '5')
  })

  it('negates a result after "=" and shows negate()', () => {
    expectScreen(run('5 + 3 = neg', ['8']).state, 'negate(8)', '-8')
  })

  it('keeps 0 without a sign', () => {
    expectScreen(run('neg').state, '', '0')
  })

  it('turns 0. into -0.', () => {
    expectScreen(run('. neg').state, '', '-0.')
  })

  it('changes only the leading sign of a value in scientific notation', () => {
    const { state, requests } = run('1 / 3 = neg *', ['1.5e-8'])
    expect(state.accumulator).toBe('-1.5e-8')
    expect(selectDisplay(state)).toBe('-1.5e-8')
    expect(requests).toHaveLength(1)
  })
})

describe('requests and errors', () => {
  it('ignores every key while a request is in flight', () => {
    const loading = calculatorReducer(run('5 +').state, { type: 'CALCULATION_STARTED' })
    for (const key of keys('1 . neg back CE C + = % sqrt')) {
      expect(planRequest(loading, key)).toBeNull()
      expect(calculatorReducer(loading, { type: 'KEY_PRESSED', key })).toBe(loading)
    }
  })

  it.each([
    ['DIVISION_BY_ZERO', 'Cannot divide by zero'],
    ['UNDEFINED_RESULT', 'Result is undefined'],
    ['INVALID_DOMAIN', 'Invalid input'],
    ['OVERFLOW', 'Overflow'],
    ['NETWORK_ERROR', 'Service unavailable'],
    ['INVALID_NUMBER', 'Something went wrong'],
  ] as const)('shows the text for %s', (code, text) => {
    const state = failWith(code, run('1 /').state)
    expect(state.status).toBe('error')
    expect(selectDisplay(state)).toBe(text)
  })

  it('disables operators, "=", %, unary keys, +/-, and "." in the error state', () => {
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0').state)
    for (const key of keys('+ - * / = % sqrt sqr inv neg .')) {
      expect(planRequest(error, key)).toBeNull()
      expect(calculatorReducer(error, { type: 'KEY_PRESSED', key })).toBe(error)
    }
  })

  it.each(['C', 'CE', 'back'])('exits the error state with %s and resets everything', (key) => {
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0').state)
    expect(run(key, [], error).state).toEqual(initialState)
  })

  it('exits the error state with a digit, which starts a new number', () => {
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0').state)
    const { state } = run('7', [], error)
    expect(state.status).toBe('ready')
    expectScreen(state, '', '7')
  })
})

describe('history', () => {
  it('starts empty', () => {
    expect(initialState.history).toEqual([])
  })

  it('records every calculated "=" with its expression, newest first', () => {
    const { state } = run('5 + 3 = = 9 sqrt + 1 =', ['8', '11', '3', '4'])
    expect(state.history).toEqual([
      { expression: '√(9) + 1 =', result: '4' },
      { expression: '8 + 3 =', result: '11' },
      { expression: '5 + 3 =', result: '8' },
    ])
  })

  it('does not record "=" without a calculation, chained results, or unary results', () => {
    expect(run('5 =').state.history).toEqual([])
    expect(run('5 + 3 * 9 sqrt', ['8', '3']).state.history).toEqual([])
  })

  it('does not record failed calculations', () => {
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0').state)
    expect(error.history).toEqual([])
  })

  it('keeps the history when C resets the calculator', () => {
    const { state } = run('5 + 3 = C', ['8'])
    expect(state.history).toEqual([{ expression: '5 + 3 =', result: '8' }])
    expect({ ...state, history: [] }).toEqual(initialState)
  })

  it('keeps the history when leaving the error state', () => {
    const calculated = run('5 + 3 =', ['8']).state
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0', [], calculated).state)
    expect(run('C', [], error).state.history).toEqual(calculated.history)
    expect(run('7', [], error).state.history).toEqual(calculated.history)
  })

  it('restores a selected entry as a result with its expression', () => {
    const { state } = run('5 + 3 = 2 * 4 =', ['8', '8'])
    const entry = state.history[1]
    const typing = run('6 +', [], state).state

    const restored = calculatorReducer(typing, { type: 'HISTORY_SELECTED', entry })

    expectScreen(restored, '5 + 3 =', '8')
    expect(restored.pendingOperator).toBeNull()
    expect(run('2', [], restored).state.expression).toBe('')
    expect(run('+ 1 =', ['9'], restored).requests).toEqual([
      { operation: 'add', operands: ['8', '1'] },
    ])
  })

  it('does not repeat an earlier operation with "=" after restoring an entry', () => {
    const { state } = run('5 + 3 =', ['8'])
    const restored = calculatorReducer(state, { type: 'HISTORY_SELECTED', entry: state.history[0] })
    expect(run('=', [], restored).requests).toEqual([])
  })

  it('restores an entry from the error state', () => {
    const calculated = run('5 + 3 =', ['8']).state
    const error = failWith('DIVISION_BY_ZERO', run('1 / 0', [], calculated).state)
    const restored = calculatorReducer(error, {
      type: 'HISTORY_SELECTED',
      entry: calculated.history[0],
    })
    expect(restored.status).toBe('ready')
    expectScreen(restored, '5 + 3 =', '8')
  })

  it('ignores a selected entry while a request is in flight', () => {
    const { state } = run('5 + 3 =', ['8'])
    const loading = calculatorReducer(state, { type: 'CALCULATION_STARTED' })
    expect(calculatorReducer(loading, { type: 'HISTORY_SELECTED', entry: state.history[0] })).toBe(
      loading,
    )
  })

  it('clears the history without changing the calculator', () => {
    const { state } = run('5 + 3 =', ['8'])
    const cleared = calculatorReducer(state, { type: 'HISTORY_CLEARED' })
    expect(cleared).toEqual({ ...state, history: [] })
  })
})
