// Display formatting works on the digit string only, so no value ever passes through a float.

const DISPLAY_DIGITS = 16

// A non-zero decimal written as d.ddd × 10^exponent; digits has no leading or trailing zeros.
type Decimal = { negative: boolean; digits: string; exponent: number }

function parse(raw: string): Decimal | null {
  const match = /^(-?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(raw)
  if (!match) {
    throw new Error(`Not a number: ${raw}`)
  }
  const [, sign, intPart, fracPart, exp = '0'] = match
  const all = intPart + fracPart
  const leadingZeros = all.length - all.replace(/^0+/, '').length
  const digits = all.slice(leadingZeros).replace(/0+$/, '')
  if (digits === '') {
    return null
  }
  return {
    negative: sign === '-',
    digits,
    exponent: intPart.length - 1 - leadingZeros + Number(exp),
  }
}

// Rounds to n significant digits, half away from zero.
function round(d: Decimal, n: number): Decimal {
  if (d.digits.length <= n) {
    return d
  }
  let digits = d.digits.slice(0, n)
  let exponent = d.exponent
  if (d.digits[n] >= '5') {
    const carried = incrementDigits(digits)
    if (carried.length > n) {
      exponent += 1
    }
    digits = carried.slice(0, n)
  }
  return { negative: d.negative, digits: digits.replace(/0+$/, ''), exponent }
}

function incrementDigits(digits: string): string {
  const chars = digits.split('')
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] !== '9') {
      chars[i] = String(Number(chars[i]) + 1)
      return chars.join('')
    }
    chars[i] = '0'
  }
  return '1' + chars.join('')
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function plain({ digits, exponent }: Decimal): string {
  if (exponent < 0) {
    return '0.' + '0'.repeat(-exponent - 1) + digits
  }
  const intPart = digits.slice(0, exponent + 1).padEnd(exponent + 1, '0')
  const fracPart = digits.slice(exponent + 1)
  return groupThousands(intPart) + (fracPart ? '.' + fracPart : '')
}

function scientific({ digits, exponent }: Decimal): string {
  const mantissa = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits
  return `${mantissa}e${exponent < 0 ? '-' : '+'}${Math.abs(exponent)}`
}

/** Formats a full-precision value: 16 significant digits, plain from 1e-7 up to below 1e16. */
export function formatResult(raw: string): string {
  const parsed = parse(raw)
  if (parsed === null) {
    return '0'
  }
  const d = round(parsed, DISPLAY_DIGITS)
  const body = d.exponent >= -7 && d.exponent < DISPLAY_DIGITS ? plain(d) : scientific(d)
  return (d.negative ? '-' : '') + body
}

/** Formats a number the user is typing, keeping a trailing point and trailing zeros. */
export function formatInput(typed: string): string {
  const negative = typed.startsWith('-')
  const [intPart, fracPart] = (negative ? typed.slice(1) : typed).split('.')
  const fraction = fracPart === undefined ? '' : '.' + fracPart
  return (negative ? '-' : '') + groupThousands(intPart) + fraction
}
