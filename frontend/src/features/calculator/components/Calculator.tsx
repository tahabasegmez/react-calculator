import { useEffect, useRef, useState } from 'react'
import { useCalculator } from '../hooks/useCalculator'
import { keyFromKeyboard } from '../state/keyboard'
import { standardKeypad } from '../state/keypadLayout'
import { isKeyDisabled, selectDisplay } from '../state/selectors'
import type { HistoryEntry, Key } from '../state/types'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { HistoryPanel } from './HistoryPanel'
import { Keypad } from './Keypad'

const HISTORY_PANEL_ID = 'history-panel'

export function Calculator() {
  const { state, press, showLoading, selectHistory, clearHistory } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyButton = useRef<HTMLButtonElement>(null)

  function closeHistory() {
    setHistoryOpen(false)
    historyButton.current?.focus()
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // While the history is open, Escape closes it and other keys keep their normal behavior.
      if (historyOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setHistoryOpen(false)
          historyButton.current?.focus()
        }
        return
      }
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
  }, [press, historyOpen])

  function restore(entry: HistoryEntry) {
    selectHistory(entry)
    closeHistory()
  }

  return (
    <section className={styles.calculator} aria-label="Calculator">
      <div className={styles.toolbar}>
        <button
          ref={historyButton}
          type="button"
          className={styles.historyButton}
          aria-label="History"
          title="History"
          aria-expanded={historyOpen}
          aria-controls={HISTORY_PANEL_ID}
          onClick={() => (historyOpen ? closeHistory() : setHistoryOpen(true))}
        >
          <HistoryIcon />
        </button>
      </div>
      <div className={styles.body} inert={historyOpen}>
        <Display expression={state.expression} value={selectDisplay(state)} loading={showLoading} />
        <Keypad
          keys={standardKeypad}
          isDisabled={(key: Key) => isKeyDisabled(state, key)}
          onPress={(key) => void press(key)}
        />
      </div>
      {historyOpen && (
        <HistoryPanel
          id={HISTORY_PANEL_ID}
          entries={state.history}
          onSelect={restore}
          onClear={clearHistory}
          onClose={closeHistory}
        />
      )}
    </section>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2"
      />
    </svg>
  )
}
