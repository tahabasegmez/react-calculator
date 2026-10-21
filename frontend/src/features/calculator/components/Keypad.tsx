import type { KeypadKey } from '../state/keypadLayout'
import type { Key as CalculatorKey } from '../state/types'
import { Key } from './Key'
import styles from './Keypad.module.css'

type KeypadProps = {
  keys: KeypadKey[]
  isDisabled: (key: CalculatorKey) => boolean
  onPress: (key: CalculatorKey) => void
}

export function Keypad({ keys, isDisabled, onPress }: KeypadProps) {
  return (
    <div className={styles.keypad}>
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
