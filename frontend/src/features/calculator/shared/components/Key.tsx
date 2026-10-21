import styles from './Key.module.css'

export type KeyVariant = 'digit' | 'function' | 'operator' | 'equals'

type KeyProps = {
  label: string
  ariaLabel: string
  variant: KeyVariant
  disabled: boolean
  onPress: () => void
}

// aria-disabled instead of disabled keeps keyboard focus on the key.
export function Key({ label, ariaLabel, variant, disabled, onPress }: KeyProps) {
  return (
    <button
      type="button"
      className={`${styles.key} ${styles[variant]}`}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onPress}
    >
      {label}
    </button>
  )
}
