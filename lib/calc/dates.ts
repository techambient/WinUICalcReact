export function parseISODate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function addToDate(date: Date, years: number, months: number, days: number): Date {
  const totalMonths = date.getMonth() + months + years * 12
  const year = date.getFullYear() + Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  const day = Math.min(date.getDate(), daysInMonth(year, month))
  const result = new Date(year, month, day)
  result.setDate(result.getDate() + days)
  return result
}

export function totalDaysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round(Math.abs(utcB - utcA) / 86400000)
}

export interface DateDifference {
  years: number
  months: number
  weeks: number
  days: number
  totalDays: number
}

export function dateDifference(a: Date, b: Date): DateDifference {
  const [start, end] = a <= b ? [a, b] : [b, a]
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()
  if (days < 0) {
    months -= 1
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  const weeks = Math.floor(days / 7)
  days = days % 7
  return { years, months, weeks, days, totalDays: totalDaysBetween(start, end) }
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

export function describeDifference(diff: DateDifference): { primary: string; secondary: string | null } {
  if (diff.totalDays === 0) return { primary: 'Same dates', secondary: null }
  const parts: string[] = []
  if (diff.years) parts.push(plural(diff.years, 'year'))
  if (diff.months) parts.push(plural(diff.months, 'month'))
  if (diff.weeks) parts.push(plural(diff.weeks, 'week'))
  if (diff.days) parts.push(plural(diff.days, 'day'))
  const primary = parts.join(', ')
  const secondary = parts.length === 1 && diff.days && !diff.weeks ? null : plural(diff.totalDays, 'day')
  return { primary, secondary }
}

export const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
