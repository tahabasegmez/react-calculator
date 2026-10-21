import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './CalculatorShell.module.css'
import { ModeMenu } from './shared/components/ModeMenu'
import type { CalculatorMode } from './shared/mode'

type CalculatorShellProps = {
  modes: CalculatorMode[]
}

/** Mode-independent frame: toolbar, mode menu, and the active mode. */
export function CalculatorShell({ modes }: CalculatorShellProps) {
  const [activeId, setActiveId] = useState(modes[0].id)
  // A mode is mounted on its first visit and then kept, so switching back keeps its state.
  const [visited, setVisited] = useState(() => new Set([modes[0].id]))
  const [menuOpen, setMenuOpen] = useState(false)
  const [toolbarActions, setToolbarActions] = useState<HTMLElement | null>(null)
  const modeButton = useRef<HTMLButtonElement>(null)

  function closeMenu() {
    setMenuOpen(false)
    modeButton.current?.focus()
  }

  // A click outside the menu closes it without moving focus.
  const dismissMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        modeButton.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function selectMode(id: string) {
    setActiveId(id)
    setVisited((current) => (current.has(id) ? current : new Set(current).add(id)))
    closeMenu()
  }

  return (
    <section className={styles.calculator} aria-label="Calculator">
      <div className={styles.toolbar}>
        <ModeMenu
          options={modes}
          current={activeId}
          open={menuOpen}
          buttonRef={modeButton}
          onToggle={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          onSelect={selectMode}
          onDismiss={dismissMenu}
        />
        <div ref={setToolbarActions} className={styles.actions} />
      </div>
      {modes
        .filter((mode) => visited.has(mode.id))
        .map(({ id, Component }) => (
          <div key={id} className={styles.mode} hidden={id !== activeId} data-mode={id}>
            <Component
              active={id === activeId}
              keyboardEnabled={id === activeId && !menuOpen}
              toolbarActions={toolbarActions}
            />
          </div>
        ))}
    </section>
  )
}
