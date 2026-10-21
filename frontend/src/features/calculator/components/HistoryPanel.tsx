import { useEffect, useRef } from 'react'
import { formatResult } from '../../../utils/format'
import type { HistoryEntry } from '../state/types'
import styles from './HistoryPanel.module.css'

type HistoryPanelProps = {
  id: string
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClear: () => void
  onClose: () => void
}

export function HistoryPanel({ id, entries, onSelect, onClear, onClose }: HistoryPanelProps) {
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    panel.current?.focus()
  }, [])

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
        data-testid="history-backdrop"
      />
      <section id={id} ref={panel} className={styles.panel} aria-label="History" tabIndex={-1}>
        <h2 className={styles.title}>History</h2>
        {entries.length === 0 ? (
          <p className={styles.empty}>There's no history yet</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry, index) => {
              const result = formatResult(entry.result)
              return (
                <li key={entries.length - index}>
                  <button
                    type="button"
                    className={styles.entry}
                    aria-label={`${entry.expression} ${result}`}
                    onClick={() => onSelect(entry)}
                  >
                    <span className={styles.expression}>{entry.expression}</span>
                    <span className={styles.result}>{result}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {entries.length > 0 && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear history"
            title="Clear history"
            onClick={onClear}
          >
            <TrashIcon />
          </button>
        )}
      </section>
    </>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"
      />
    </svg>
  )
}
