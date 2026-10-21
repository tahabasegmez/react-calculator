import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScientificCalculator } from './ScientificCalculator'

describe('Scientific mode', () => {
  it('shows "Soon.." over a blurred preview of the scientific keypad', () => {
    render(<ScientificCalculator />)

    expect(screen.getByText('Soon..')).toBeInTheDocument()
    const preview = screen.getByTestId('scientific-preview')
    expect(preview).toHaveAttribute('aria-hidden', 'true')
    expect(preview.textContent).toContain('log')
    expect(screen.getByTestId('scientific-keypad').children).toHaveLength(35)
  })

  it('has no usable keys', () => {
    render(<ScientificCalculator />)
    expect(screen.queryAllByRole('button')).toEqual([])
  })
})
