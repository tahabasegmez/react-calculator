import { useEffect } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { keyFromKeyboard } from '../state/keyboard'
import { standardKeypad } from '../state/keypadLayout'
import { isKeyDisabled, selectDisplay } from '../state/selectors'
import type { Key } from '../state/types'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { Keypad } from './Keypad'

export function Calculator() {
  const { state, press, showLoading } = useCalculator()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = keyFromKeyboard(event)
      if (key === null) {
        return
      }
      // Stops Enter from also clicking a focused key button.
      event.preventDefault()
      void press(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [press])

  return (
    <section className={styles.calculator} aria-label="Calculator">
      <Display expression={state.expression} value={selectDisplay(state)} loading={showLoading} />
      <Keypad
        keys={standardKeypad}
        isDisabled={(key: Key) => isKeyDisabled(state, key)}
        onPress={(key) => void press(key)}
      />
    </section>
  )
}
