import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate } from '../../../api/client'
import { standardKeypad } from '../state/keypadLayout'
import { Calculator } from './Calculator'

vi.mock('../../../api/client', () => ({ calculate: vi.fn() }))
const calculateMock = vi.mocked(calculate)

afterEach(() => {
  calculateMock.mockReset()
})

const value = () => screen.getByTestId('value').textContent
const expression = () => screen.getByTestId('expression').textContent
const key = (name: string) => screen.getByRole('button', { name })
const requests = () => calculateMock.mock.calls.map(([request]) => request)

function setup() {
  const user = userEvent.setup()
  render(<Calculator />)
  return user
}

describe('Calculator', () => {
  it('renders every key with an accessible name', () => {
    setup()
    expect(screen.getAllByRole('button')).toHaveLength(24)
    for (const { ariaLabel } of standardKeypad) {
      expect(key(ariaLabel)).toBeInTheDocument()
    }
  })

  it('announces the display politely', () => {
    setup()
    expect(screen.getByTestId('value').parentElement).toHaveAttribute('aria-live', 'polite')
  })

  it('calculates with mouse clicks', async () => {
    calculateMock.mockResolvedValueOnce({ ok: true, result: '0.3' })
    const user = setup()

    for (const name of ['0', 'decimal point', '1', 'add', '0', 'decimal point', '2', 'equals']) {
      await user.click(key(name))
    }

    expect(requests()).toEqual([{ operation: 'add', operands: ['0.1', '0.2'] }])
    expect(expression()).toBe('0.1 + 0.2 =')
    expect(value()).toBe('0.3')
  })

  it('calculates with the keyboard', async () => {
    calculateMock
      .mockResolvedValueOnce({ ok: true, result: '5' })
      .mockResolvedValueOnce({ ok: true, result: '20' })
    const user = setup()

    await user.keyboard('2+3*4=')

    expect(requests()).toEqual([
      { operation: 'add', operands: ['2', '3'] },
      { operation: 'multiply', operands: ['5', '4'] },
    ])
    expect(value()).toBe('20')
  })

  it.each([
    ['{Shift>}@{/Shift}', 'sqrt', '√(9)'],
    ['q', 'square', 'sqr(9)'],
    ['r', 'reciprocal', '1/(9)'],
  ])('supports the shortcut %s', async (shortcut, operation, shown) => {
    calculateMock.mockResolvedValueOnce({ ok: true, result: '1' })
    const user = setup()

    await user.keyboard(`9${shortcut}`)

    expect(requests()).toEqual([{ operation, operands: ['9'] }])
    expect(expression()).toBe(shown)
  })

  it('supports the editing shortcuts', async () => {
    const user = setup()

    await user.keyboard('123{Backspace}')
    expect(value()).toBe('12')
    await user.keyboard('{F9}')
    expect(value()).toBe('-12')
    await user.keyboard('+5{Delete}')
    expect(value()).toBe('0')
    expect(expression()).toBe('-12 +')
    await user.keyboard('{Escape}')
    expect(value()).toBe('0')
    expect(expression()).toBe('')
  })

  it('triggers "=" exactly once when Enter is pressed on a focused key', async () => {
    calculateMock.mockResolvedValueOnce({ ok: true, result: '8' })
    const user = setup()

    await user.click(key('5'))
    await user.click(key('add'))
    await user.click(key('3'))
    expect(key('3')).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(requests()).toEqual([{ operation: 'add', operands: ['5', '3'] }])
    expect(value()).toBe('8')
  })

  it('does not also click the focused key when Enter triggers "=" without a request', async () => {
    const user = setup()

    await user.click(key('7'))
    await user.keyboard('{Enter}')

    expect(expression()).toBe('7 =')
    expect(value()).toBe('7')
  })

  it('presses a focused key with Space', async () => {
    const user = setup()

    await user.tab()
    expect(key('percent')).toHaveFocus()
    await user.click(key('7'))
    key('7').focus()
    await user.keyboard(' ')

    expect(value()).toBe('77')
  })

  it('shows the error text and disables keys in the error state', async () => {
    calculateMock.mockResolvedValueOnce({ ok: false, code: 'DIVISION_BY_ZERO' })
    const user = setup()

    await user.keyboard('1/0=')

    expect(value()).toBe('Cannot divide by zero')
    for (const name of ['add', 'equals', 'percent', 'square root', 'negate', 'decimal point']) {
      expect(key(name)).toHaveAttribute('aria-disabled', 'true')
    }
    for (const name of ['clear', 'clear entry', 'backspace', '7']) {
      expect(key(name)).toHaveAttribute('aria-disabled', 'false')
    }

    await user.click(key('add'))
    expect(value()).toBe('Cannot divide by zero')
    await user.click(key('7'))
    expect(value()).toBe('7')
    expect(expression()).toBe('')
  })

  it('tells the user when the service is unavailable', async () => {
    calculateMock.mockResolvedValueOnce({ ok: false, code: 'NETWORK_ERROR' })
    const user = setup()

    await user.keyboard('9q')

    expect(value()).toBe('Service unavailable')
  })
})
