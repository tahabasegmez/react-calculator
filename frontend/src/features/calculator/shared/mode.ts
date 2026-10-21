import type { ComponentType } from 'react'

/** What the shell passes to every calculator mode. */
export type ModeProps = {
  /** The mode is shown. Inactive modes stay mounted (hidden) and keep their state. */
  active: boolean
  /** The mode may handle keyboard shortcuts: false when inactive or while the mode menu is open. */
  keyboardEnabled: boolean
  /** Toolbar slot (top right) for the mode's own buttons; render into it only while active. */
  toolbarActions: HTMLElement | null
}

export type CalculatorMode = {
  id: string
  label: string
  Component: ComponentType<ModeProps>
}
