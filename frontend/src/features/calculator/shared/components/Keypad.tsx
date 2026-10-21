import type { CSSProperties } from 'react'
import { Key, type KeyVariant } from './Key'
import styles from './Keypad.module.css'

/** One key of a keypad layout; each mode defines its own action type. */
export type KeypadKey<Action> = {
  label: string
  ariaLabel: string
  action: Action
  variant: KeyVariant
}

type KeypadProps<Action> = {
  keys: KeypadKey<Action>[]
  columns: number
  isDisabled: (action: Action) => boolean
  onPress: (action: Action) => void
}

export function Keypad<Action>({ keys, columns, isDisabled, onPress }: KeypadProps<Action>) {
  return (
    <div className={styles.keypad} style={{ '--columns': columns } as CSSProperties}>
      {keys.map((key) => (
        <Key
          key={key.ariaLabel}
          label={key.label}
          ariaLabel={key.ariaLabel}
          variant={key.variant}
          disabled={isDisabled(key.action)}
          onPress={() => onPress(key.action)}
        />
      ))}
    </div>
  )
}
