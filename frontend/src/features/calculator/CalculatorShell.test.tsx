import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { describe, expect, it } from 'vitest'
import { CalculatorShell } from './CalculatorShell'
import type { CalculatorMode, ModeProps } from './shared/mode'

// A minimal mode: shows the props it receives, keeps a counter, and adds a toolbar button.
function FakeMode({ name, active, keyboardEnabled, toolbarActions }: ModeProps & { name: string }) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p data-testid={`${name}-props`}>
        active={String(active)} keyboard={String(keyboardEnabled)} count={count}
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        {name} increment
      </button>
      {active &&
        toolbarActions &&
        createPortal(<button type="button">{name} action</button>, toolbarActions)}
    </div>
  )
}

const fakeModes: CalculatorMode[] = [
  { id: 'alpha', label: 'Alpha', Component: (props) => <FakeMode name="alpha" {...props} /> },
  { id: 'beta', label: 'Beta', Component: (props) => <FakeMode name="beta" {...props} /> },
]

const button = (name: string) => screen.getByRole('button', { name })
const modeProps = (name: string) => screen.getByTestId(`${name}-props`).textContent
const modeContainer = (name: string) => screen.getByTestId(`${name}-props`).closest('[data-mode]')

function setup() {
  const user = userEvent.setup()
  render(<CalculatorShell modes={fakeModes} />)
  return user
}

async function switchTo(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(button('Calculator mode'))
  await user.click(button(label))
}

describe('CalculatorShell', () => {
  it('starts with the first mode and does not mount the others yet', () => {
    setup()
    expect(modeProps('alpha')).toBe('active=true keyboard=true count=0')
    expect(screen.queryByTestId('beta-props')).not.toBeInTheDocument()
  })

  it('lists the modes in the menu and marks the current one', async () => {
    const user = setup()

    await user.click(button('Calculator mode'))

    expect(button('Calculator mode')).toHaveAttribute('aria-expanded', 'true')
    expect(button('Alpha')).toHaveAttribute('aria-current', 'true')
    expect(button('Beta')).toHaveAttribute('aria-current', 'false')
    expect(button('Alpha')).toHaveFocus()
  })

  it('shows the selected mode and hides the previous one', async () => {
    const user = setup()

    await switchTo(user, 'Beta')

    expect(modeProps('beta')).toBe('active=true keyboard=true count=0')
    expect(modeProps('alpha')).toBe('active=false keyboard=false count=0')
    expect(modeContainer('alpha')).toHaveAttribute('hidden')
    expect(modeContainer('beta')).not.toHaveAttribute('hidden')
    expect(button('Calculator mode')).toHaveFocus()
  })

  it('keeps a mode mounted, with its state, after switching away and back', async () => {
    const user = setup()
    await user.click(button('alpha increment'))
    await user.click(button('alpha increment'))

    await switchTo(user, 'Beta')
    await switchTo(user, 'Alpha')

    expect(modeProps('alpha')).toBe('active=true keyboard=true count=2')
  })

  it('disables the active mode keyboard while the menu is open', async () => {
    const user = setup()

    await user.click(button('Calculator mode'))
    expect(modeProps('alpha')).toBe('active=true keyboard=false count=0')

    await user.keyboard('{Escape}')
    expect(modeProps('alpha')).toBe('active=true keyboard=true count=0')
  })

  it('shows only the active mode toolbar buttons', async () => {
    const user = setup()
    expect(button('alpha action')).toBeInTheDocument()

    await switchTo(user, 'Beta')

    expect(button('beta action')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'alpha action' })).not.toBeInTheDocument()
  })

  it('closes the menu with Escape and returns focus to the mode button', async () => {
    const user = setup()
    await user.click(button('Calculator mode'))

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument()
    expect(button('Calculator mode')).toHaveFocus()
  })

  it('closes the menu on a click outside it and with the mode button', async () => {
    const user = setup()

    await user.click(button('Calculator mode'))
    await user.click(screen.getByTestId('alpha-props'))
    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument()

    await user.click(button('Calculator mode'))
    await user.click(button('Calculator mode'))
    expect(button('Calculator mode')).toHaveAttribute('aria-expanded', 'false')
  })

  it('selects a mode with Enter', async () => {
    const user = setup()
    await user.click(button('Calculator mode'))

    button('Beta').focus()
    await user.keyboard('{Enter}')

    expect(modeProps('beta')).toBe('active=true keyboard=true count=0')
  })
})
