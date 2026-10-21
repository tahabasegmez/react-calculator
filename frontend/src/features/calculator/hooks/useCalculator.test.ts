import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate } from '../../../api/client'
import type { CalculationResult } from '../../../api/types'
import { selectDisplay } from '../state/selectors'
import type { Digit, Key } from '../state/types'
import { useCalculator } from './useCalculator'

vi.mock('../../../api/client', () => ({ calculate: vi.fn() }))
const calculateMock = vi.mocked(calculate)

afterEach(() => {
  calculateMock.mockReset()
  vi.useRealTimers()
})

const digit = (d: Digit): Key => ({ type: 'digit', digit: d })
const add: Key = { type: 'operator', operator: 'add' }
const multiply: Key = { type: 'operator', operator: 'multiply' }
const equals: Key = { type: 'equals' }

function deferred() {
  let resolve!: (value: CalculationResult) => void
  const promise = new Promise<CalculationResult>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

async function pressAll(result: { current: ReturnType<typeof useCalculator> }, keys: Key[]) {
  for (const key of keys) {
    await act(() => result.current.press(key))
  }
}

describe('useCalculator', () => {
  it('handles local keys without a request', async () => {
    const { result } = renderHook(() => useCalculator())
    await pressAll(result, [digit('1'), digit('2')])
    expect(calculateMock).not.toHaveBeenCalled()
    expect(selectDisplay(result.current.state)).toBe('12')
  })

  it('sends chained operations to the backend in order', async () => {
    calculateMock
      .mockResolvedValueOnce({ ok: true, result: '5' })
      .mockResolvedValueOnce({ ok: true, result: '20' })
    const { result } = renderHook(() => useCalculator())

    await pressAll(result, [digit('2'), add, digit('3'), multiply, digit('4'), equals])

    expect(calculateMock.mock.calls.map(([request]) => request)).toEqual([
      { operation: 'add', operands: ['2', '3'] },
      { operation: 'multiply', operands: ['5', '4'] },
    ])
    expect(selectDisplay(result.current.state)).toBe('20')
    expect(result.current.state.expression).toBe('5 × 4 =')
  })

  it('ignores keys while a request is in flight', async () => {
    const pending = deferred()
    calculateMock.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useCalculator())
    await pressAll(result, [digit('2'), add, digit('3')])

    let first!: Promise<void>
    act(() => {
      first = result.current.press(equals)
    })
    expect(result.current.state.status).toBe('loading')
    await act(() => result.current.press(digit('9')))
    await act(() => result.current.press(equals))
    expect(calculateMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve({ ok: true, result: '5' })
      await first
    })
    expect(selectDisplay(result.current.state)).toBe('5')
  })

  it('shows the loading indicator only after 300 ms', async () => {
    vi.useFakeTimers()
    const pending = deferred()
    calculateMock.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useCalculator())

    let request!: Promise<void>
    act(() => {
      request = result.current.press({ type: 'unary', operator: 'sqrt' })
    })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current.showLoading).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.showLoading).toBe(true)

    await act(async () => {
      pending.resolve({ ok: true, result: '0' })
      await request
    })
    expect(result.current.showLoading).toBe(false)
  })

  it('enters the error state when the backend returns an error', async () => {
    calculateMock.mockResolvedValueOnce({ ok: false, code: 'DIVISION_BY_ZERO' })
    const { result } = renderHook(() => useCalculator())

    await pressAll(result, [
      digit('1'),
      { type: 'operator', operator: 'divide' },
      digit('0'),
      equals,
    ])

    expect(result.current.state.status).toBe('error')
    expect(selectDisplay(result.current.state)).toBe('Cannot divide by zero')
  })

  it('aborts the request on unmount and ignores its result', async () => {
    const pending = deferred()
    calculateMock.mockReturnValueOnce(pending.promise)
    const { result, unmount } = renderHook(() => useCalculator())

    let request!: Promise<void>
    act(() => {
      request = result.current.press({ type: 'unary', operator: 'sqrt' })
    })
    const signal = calculateMock.mock.calls[0][1]
    unmount()

    expect(signal?.aborted).toBe(true)
    pending.resolve({ ok: false, code: 'NETWORK_ERROR' })
    await request
  })
})
