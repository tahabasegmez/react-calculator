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
    expect(screen.getAllByRole('button')).toHaveLength(standardKeypad.length + 1)
    expect(key('History')).toBeInTheDocument()
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
    expect(key('History')).toHaveFocus()
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

describe('history panel', () => {
  async function calculateFivePlusThree(user: ReturnType<typeof userEvent.setup>) {
    calculateMock.mockResolvedValueOnce({ ok: true, result: '8' })
    await user.keyboard('5+3=')
  }

  it('opens from the History button and says when it is empty', async () => {
    const user = setup()

    await user.click(key('History'))

    expect(key('History')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'History' })).toHaveFocus()
    expect(screen.getByText("There's no history yet")).toBeInTheDocument()
  })

  it('lists calculations and restores one on click', async () => {
    const user = setup()
    await calculateFivePlusThree(user)
    await user.keyboard('{Escape}9')

    await user.click(key('History'))
    await user.click(key('5 + 3 = 8'))

    expect(expression()).toBe('5 + 3 =')
    expect(value()).toBe('8')
    expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
    expect(key('History')).toHaveFocus()
  })

  it('closes with Escape without clearing the calculator', async () => {
    const user = setup()
    await calculateFivePlusThree(user)
    await user.click(key('History'))

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
    expect(value()).toBe('8')
    expect(key('History')).toHaveFocus()
  })

  it('closes with the History button and with a click outside the panel', async () => {
    const user = setup()

    await user.click(key('History'))
    await user.click(key('History'))
    expect(key('History')).toHaveAttribute('aria-expanded', 'false')

    await user.click(key('History'))
    await user.click(screen.getByTestId('history-backdrop'))
    expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
  })

  it('does not pass calculator shortcuts to the keypad while open', async () => {
    const user = setup()
    await user.keyboard('12')
    await user.click(key('History'))

    await user.keyboard('3{Backspace}')

    expect(value()).toBe('12')
  })

  it('selects an entry with Enter', async () => {
    const user = setup()
    await calculateFivePlusThree(user)
    await user.keyboard('{Escape}')
    await user.click(key('History'))

    key('5 + 3 = 8').focus()
    await user.keyboard('{Enter}')

    expect(expression()).toBe('5 + 3 =')
    expect(calculateMock).toHaveBeenCalledTimes(1)
  })

  it('clears the history', async () => {
    const user = setup()
    await calculateFivePlusThree(user)
    await user.click(key('History'))

    await user.click(key('Clear history'))

    expect(screen.getByText("There's no history yet")).toBeInTheDocument()
    expect(value()).toBe('8')
  })
})

describe('display font size', () => {
  it('shrinks the value line for long numbers', async () => {
    const user = setup()
    expect(screen.getByTestId('value')).toHaveAttribute('data-size', 'large')

    await user.keyboard('1234567890123456')

    expect(value()).toBe('1,234,567,890,123,456')
    expect(screen.getByTestId('value')).toHaveAttribute('data-size', 'smallest')
  })
})
