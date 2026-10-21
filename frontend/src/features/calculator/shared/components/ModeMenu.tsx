import { useEffect, useRef, type RefObject } from 'react'
import styles from './ModeMenu.module.css'

const MENU_ID = 'mode-menu'

type ModeMenuProps = {
  options: { id: string; label: string }[]
  current: string
  open: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  onToggle: () => void
  onSelect: (id: string) => void
  onDismiss: () => void
}

export function ModeMenu({
  options,
  current,
  open,
  buttonRef,
  onToggle,
  onSelect,
  onDismiss,
}: ModeMenuProps) {
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-current="true"]')
      ?.focus({ preventScroll: true })

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !buttonRef.current?.contains(target)) {
        onDismiss()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, buttonRef, onDismiss])

  return (
    <div className={styles.container}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-label="Calculator mode"
        title="Calculator mode"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={onToggle}
      >
        <MenuIcon />
      </button>
      {open && (
        <div id={MENU_ID} ref={menu} className={styles.menu}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              aria-current={option.id === current}
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M4 7h16M4 12h16M4 17h16"
      />
    </svg>
  )
}
