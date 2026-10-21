import keyStyles from '../shared/components/Key.module.css'
import styles from './ScientificCalculator.module.css'

// Windows Scientific mode keys, five per row. Shown only as a preview; they do nothing.
const scientificPreviewKeys = [
  ['2nd', 'π', 'e', 'C', '⌫'],
  ['x²', '1/x', '|x|', 'exp', 'mod'],
  ['√x', '(', ')', 'n!', '÷'],
  ['xʸ', '7', '8', '9', '×'],
  ['10ˣ', '4', '5', '6', '−'],
  ['log', '1', '2', '3', '+'],
  ['ln', '+/-', '0', '.', '='],
].flat()

function variant(label: string): string {
  if (label === '=') {
    return keyStyles.equals
  }
  if (label === 'C') {
    return keyStyles.clear
  }
  if (['÷', '×', '−', '+'].includes(label)) {
    return keyStyles.operator
  }
  return /^[\d.]$|^\+\/-$/.test(label) ? keyStyles.digit : keyStyles.function
}

/** Scientific mode is not built yet: a blurred preview of its keypad, marked "Soon..". */
export function ScientificCalculator() {
  return (
    <div className={styles.preview}>
      <div className={styles.blurred} aria-hidden="true" data-testid="scientific-preview">
        <div className={styles.display}>0</div>
        <div className={styles.keypad} data-testid="scientific-keypad">
          {scientificPreviewKeys.map((label) => (
            <div key={label} className={`${keyStyles.key} ${variant(label)} ${styles.key}`}>
              {label}
            </div>
          ))}
        </div>
      </div>
      <p className={styles.soon}>Soon..</p>
    </div>
  )
}
