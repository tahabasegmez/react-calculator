import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Display } from '../shared/components/Display'
import { HistoryPanel } from '../shared/components/HistoryPanel'
import { Keypad } from '../shared/components/Keypad'
import type { ModeProps } from '../shared/mode'
import type { HistoryEntry } from '../shared/types'
import { useCalculator } from './hooks/useCalculator'
import { keyFromKeyboard } from './state/keyboard'
import { STANDARD_COLUMNS, standardKeypad } from './state/keypadLayout'
import { isKeyDisabled, selectDisplay } from './state/selectors'
import type { Key } from './state/types'
import styles from './StandardCalculator.module.css'

const HISTORY_PANEL_ID = 'history-panel'

export function StandardCalculator({ active, keyboardEnabled, toolbarActions }: ModeProps) {
  const { state, press, showLoading, selectHistory, clearHistory } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [wasActive, setWasActive] = useState(active)
  const historyButton = useRef<HTMLButtonElement>(null)

  // The history panel closes when another mode is shown.
  if (active !== wasActive) {
    setWasActive(active)
    if (!active) {
      setHistoryOpen(false)
    }
  }

  function closeHistory() {
    setHistoryOpen(false)
    historyButton.current?.focus()
  }

  useEffect(() => {
    if (!keyboardEnabled) {
      return
    }
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
  }, [keyboardEnabled, press, historyOpen])

  function restore(entry: HistoryEntry) {
    selectHistory(entry)
    closeHistory()
  }

  return (
    <>
      {active &&
        toolbarActions &&
        createPortal(
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
          </button>,
          toolbarActions,
        )}
      <div className={styles.body} inert={historyOpen}>
        <Display expression={state.expression} value={selectDisplay(state)} loading={showLoading} />
        <Keypad
          keys={standardKeypad}
          columns={STANDARD_COLUMNS}
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
    </>
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
