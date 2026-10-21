export type ValueSize = 'large' | 'medium' | 'small' | 'smallest'

/** Picks a font size step so that the value line fits on one line from 320 px wide. */
export function valueSize(text: string): ValueSize {
  if (text.length <= 12) {
    return 'large'
  }
  if (text.length <= 15) {
    return 'medium'
  }
  if (text.length <= 20) {
    return 'small'
  }
  return 'smallest'
}
