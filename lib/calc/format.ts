export function groupInteger(intPart: string, separator = ',', size = 3): string {
  const negative = intPart.startsWith('-')
  const digits = negative ? intPart.slice(1) : intPart
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % size === 0) out += separator
    out += digits[i]
  }
  return (negative ? '-' : '') + out
}

function trimMantissa(mantissa: string): string {
  if (!mantissa.includes('.')) return mantissa + '.'
  const trimmed = mantissa.replace(/0+$/, '')
  return trimmed
}

/** Formats a number the way Windows Calculator displays results. */
export function formatNumber(value: number, scientific = false, group = true): string {
  if (Object.is(value, -0)) value = 0
  if (!Number.isFinite(value)) return 'Overflow'
  const abs = Math.abs(value)

  if (scientific || (abs !== 0 && (abs >= 1e16 || abs < 1e-15))) {
    const [mantissa, exponent] = value.toExponential(15).split('e')
    const exp = Number(exponent)
    return `${trimMantissa(mantissa)}e${exp >= 0 ? '+' : '-'}${Math.abs(exp)}`
  }

  const precise = Number(value.toPrecision(16))
  let text = precise.toString()
  if (text.includes('e')) {
    text = precise.toFixed(20).replace(/\.?0+$/, '')
  }
  const [intPart, frac] = text.split('.')
  const grouped = group ? groupInteger(intPart) : intPart
  return frac ? `${grouped}.${frac}` : grouped
}

/** Formats a raw entry string the user is currently typing (keeps trailing dot / zeros). */
export function formatEntry(entry: string, group = true): string {
  const [mantissa, exponent] = entry.split('e')
  const [intPart, frac] = mantissa.split('.')
  let out = group ? groupInteger(intPart) : intPart
  if (mantissa.includes('.')) out += '.' + (frac ?? '')
  if (exponent !== undefined) out += 'e' + exponent
  return out
}

export function parseEntry(entry: string): number {
  const normalized = entry.replace(/\.e/, 'e').replace(/e([+-]?)$/, '')
  const n = Number(normalized)
  return Number.isNaN(n) ? 0 : n
}
