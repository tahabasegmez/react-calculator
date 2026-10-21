import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { calculate } from './api/client'

vi.mock('./api/client', () => ({ calculate: vi.fn() }))
const calculateMock = vi.mocked(calculate)

afterEach(() => {
  calculateMock.mockReset()
})

const button = (name: string) => screen.getByRole('button', { name })

async function switchTo(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(button('Calculator mode'))
  await user.click(button(label))
}

describe('App', () => {
  it('renders the calculator heading and starts in Standard mode', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
    expect(button('equals')).toBeInTheDocument()
    expect(button('History')).toBeInTheDocument()
  })

  it('switches to the Scientific preview, where Standard shortcuts do nothing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await switchTo(user, 'Scientific')
    await user.keyboard('5+3=q')

    expect(screen.getByText('Soon..')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('keeps the Standard calculation when switching back', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('12+')

    await switchTo(user, 'Scientific')
    await switchTo(user, 'Standard')

    expect(screen.getByTestId('expression')).toHaveTextContent('12 +')
    expect(screen.getByTestId('value')).toHaveTextContent('12')
  })
})
