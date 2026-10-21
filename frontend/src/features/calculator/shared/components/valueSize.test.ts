import { describe, expect, it } from 'vitest'
import { valueSize } from './valueSize'

describe('valueSize', () => {
  it.each([
    ['0', 'large'],
    ['123,456,789', 'large'],
    ['1,234,567,890', 'medium'],
    ['123,456,789,012', 'medium'],
    ['1,234,567,890,123', 'small'],
    ['Cannot divide by zero', 'smallest'],
    ['-1,234,567,890,123,456', 'smallest'],
    ['-1.234567890123457e+9999', 'smallest'],
  ])('sizes %s as %s', (text, size) => {
    expect(valueSize(text)).toBe(size)
  })
})
