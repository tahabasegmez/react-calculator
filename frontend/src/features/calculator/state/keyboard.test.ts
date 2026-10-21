import { describe, expect, it } from 'vitest'
import { keyFromKeyboard } from './keyboard'
import type { Key } from './types'

const plain = (key: string) => ({ key, ctrlKey: false, metaKey: false, altKey: false })

describe('keyFromKeyboard', () => {
  it.each<[string, Key]>([
    ['7', { type: 'digit', digit: '7' }],
    ['0', { type: 'digit', digit: '0' }],
    ['.', { type: 'decimal' }],
    ['+', { type: 'operator', operator: 'add' }],
    ['-', { type: 'operator', operator: 'subtract' }],
    ['*', { type: 'operator', operator: 'multiply' }],
    ['/', { type: 'operator', operator: 'divide' }],
    ['Enter', { type: 'equals' }],
    ['=', { type: 'equals' }],
    ['Backspace', { type: 'backspace' }],
    ['Escape', { type: 'clear' }],
    ['Delete', { type: 'clearEntry' }],
    ['%', { type: 'percent' }],
    ['@', { type: 'unary', operator: 'sqrt' }],
    ['q', { type: 'unary', operator: 'square' }],
    ['r', { type: 'unary', operator: 'reciprocal' }],
    ['F9', { type: 'negate' }],
  ])('maps %s', (key, expected) => {
    expect(keyFromKeyboard(plain(key))).toEqual(expected)
  })

  it.each(['a', 'Tab', ' ', 'ArrowUp', 'F5'])('ignores %j', (key) => {
    expect(keyFromKeyboard(plain(key))).toBeNull()
  })

  it.each(['ctrlKey', 'metaKey', 'altKey'] as const)(
    'leaves shortcuts with %s alone',
    (modifier) => {
      expect(keyFromKeyboard({ ...plain('r'), [modifier]: true })).toBeNull()
    },
  )
})
