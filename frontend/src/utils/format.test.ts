import { describe, expect, it } from 'vitest'
import { formatInput, formatResult } from './format'

describe('formatResult', () => {
  it.each([
    ['0', '0'],
    ['-0', '0'],
    ['0.3', '0.3'],
    ['12.', '12'],
    ['1500', '1,500'],
    ['1234567', '1,234,567'],
    ['-1234567.891', '-1,234,567.891'],
  ])('formats %s as %s', (raw, want) => {
    expect(formatResult(raw)).toBe(want)
  })

  it('keeps every digit of integers beyond float precision', () => {
    expect(formatResult('9007199254740993')).toBe('9,007,199,254,740,993')
  })

  it.each([
    ['0.3333333333333333333333333333333333', '0.3333333333333333'],
    ['0.6666666666666666666666666666666667', '0.6666666666666667'],
    ['-0.6666666666666666666666666666666667', '-0.6666666666666667'],
    ['1.0000000000000005', '1.000000000000001'],
    ['-1.0000000000000005', '-1.000000000000001'],
    ['1.0000000000000004', '1'],
    ['0.9999999999999999999999999999999999', '1'],
  ])('rounds %s to 16 significant digits half away from zero: %s', (raw, want) => {
    expect(formatResult(raw)).toBe(want)
  })

  it.each([
    ['9999999999999999', '9,999,999,999,999,999'],
    ['10000000000000000', '1e+16'],
    ['9999999999999999.5', '1e+16'],
    ['0.0000001', '0.0000001'],
    ['0.00000009999999999999999', '9.999999999999999e-8'],
    ['0.000000099999999999999999', '0.0000001'],
    ['0.00000001', '1e-8'],
    ['1.5e-8', '1.5e-8'],
    ['1.2e+20', '1.2e+20'],
    ['12345678901234567890123456789012345', '1.234567890123457e+34'],
  ])('switches notation at the display boundaries: %s as %s', (raw, want) => {
    expect(formatResult(raw)).toBe(want)
  })

  it.each([
    ['1e400', '1e+400'],
    ['-9.5e9999', '-9.5e+9999'],
    ['1e-400', '1e-400'],
  ])('handles magnitudes beyond the JavaScript number range: %s', (raw, want) => {
    expect(formatResult(raw)).toBe(want)
  })
})

describe('formatInput', () => {
  it.each([
    ['0', '0'],
    ['0.', '0.'],
    ['-0.', '-0.'],
    ['12.50', '12.50'],
    ['-1234', '-1,234'],
    ['1234567.10', '1,234,567.10'],
    ['1234567890123456', '1,234,567,890,123,456'],
  ])('keeps the typed notation of %s: %s', (typed, want) => {
    expect(formatInput(typed)).toBe(want)
  })
})
