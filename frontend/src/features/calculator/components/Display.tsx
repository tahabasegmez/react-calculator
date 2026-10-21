import styles from './Display.module.css'

type DisplayProps = {
  expression: string
  value: string
  loading: boolean
}

export function Display({ expression, value, loading }: DisplayProps) {
  return (
    <div className={styles.display} aria-live="polite" aria-atomic="true">
      <div className={styles.expression} data-testid="expression">
        {expression}
      </div>
      <div className={styles.value} data-testid="value">
        {loading ? <span className={styles.loading}>Calculating…</span> : value}
      </div>
    </div>
  )
}
