import type { Digit, Key } from './types'

export type KeyVariant = 'digit' | 'function' | 'operator' | 'equals'

export type KeypadKey = {
  label: string
  ariaLabel: string
  action: Key
  variant: KeyVariant
}

const digit = (d: Digit): KeypadKey => ({
  label: d,
  ariaLabel: d,
  action: { type: 'digit', digit: d },
  variant: 'digit',
})

/** Standard mode keys, row by row, four per row. */
export const standardKeypad: KeypadKey[] = [
  { label: '%', ariaLabel: 'percent', action: { type: 'percent' }, variant: 'function' },
  { label: 'CE', ariaLabel: 'clear entry', action: { type: 'clearEntry' }, variant: 'function' },
  { label: 'C', ariaLabel: 'clear', action: { type: 'clear' }, variant: 'function' },
  { label: '⌫', ariaLabel: 'backspace', action: { type: 'backspace' }, variant: 'function' },

  {
    label: '1/x',
    ariaLabel: 'reciprocal',
    action: { type: 'unary', operator: 'reciprocal' },
    variant: 'function',
  },
  {
    label: 'x²',
    ariaLabel: 'square',
    action: { type: 'unary', operator: 'square' },
    variant: 'function',
  },
  {
    label: '√x',
    ariaLabel: 'square root',
    action: { type: 'unary', operator: 'sqrt' },
    variant: 'function',
  },
  {
    label: '÷',
    ariaLabel: 'divide',
    action: { type: 'operator', operator: 'divide' },
    variant: 'operator',
  },

  digit('7'),
  digit('8'),
  digit('9'),
  {
    label: '×',
    ariaLabel: 'multiply',
    action: { type: 'operator', operator: 'multiply' },
    variant: 'operator',
  },

  digit('4'),
  digit('5'),
  digit('6'),
  {
    label: '−',
    ariaLabel: 'subtract',
    action: { type: 'operator', operator: 'subtract' },
    variant: 'operator',
  },

  digit('1'),
  digit('2'),
  digit('3'),
  {
    label: '+',
    ariaLabel: 'add',
    action: { type: 'operator', operator: 'add' },
    variant: 'operator',
  },

  { label: '+/-', ariaLabel: 'negate', action: { type: 'negate' }, variant: 'digit' },
  digit('0'),
  { label: '.', ariaLabel: 'decimal point', action: { type: 'decimal' }, variant: 'digit' },
  { label: '=', ariaLabel: 'equals', action: { type: 'equals' }, variant: 'equals' },
]
