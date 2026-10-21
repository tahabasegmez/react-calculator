import type { Digit, Key } from './types'

const keyMap: Record<string, Key> = {
  '.': { type: 'decimal' },
  '+': { type: 'operator', operator: 'add' },
  '-': { type: 'operator', operator: 'subtract' },
  '*': { type: 'operator', operator: 'multiply' },
  '/': { type: 'operator', operator: 'divide' },
  Enter: { type: 'equals' },
  '=': { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  Delete: { type: 'clearEntry' },
  '%': { type: 'percent' },
  '@': { type: 'unary', operator: 'sqrt' },
  q: { type: 'unary', operator: 'square' },
  r: { type: 'unary', operator: 'reciprocal' },
  F9: { type: 'negate' },
}

type KeyboardInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>

/** Maps a keyboard event to a calculator key; browser shortcuts with Ctrl, Meta, or Alt are left alone. */
export function keyFromKeyboard(event: KeyboardInput): Key | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null
  }
  if (/^\d$/.test(event.key)) {
    return { type: 'digit', digit: event.key as Digit }
  }
  return keyMap[event.key] ?? null
}
