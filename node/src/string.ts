import { DayOfWeek, daysOfWeek, Session } from './types'

/**
 * returns a new string that is the camelCase of the old string.
 */
export function camelCaseify(v: string) {
  const words = v.toLowerCase().split(' ')
  return words
    .map((w, i) => (i > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join('')
}

/**
 * Checks whether or not the line is a Training Day
 * e.g. `Monday (AM)` or `Sunday (PM)`
 */
export function isTrainingDay(line: string): boolean {
  if (!line || typeof line !== 'string') return false
  const day = daysOfWeek.find((d) => line.startsWith(d))
  if (!day) return false
  if (line[day.length] !== ' ') return false
  const time = line.slice(day.length + 1)
  return time === '(AM)' || time === '(PM)'
}

/**
 * Gets DayOfWeek and Session from a training day.
 */
export function parseTrainingDay(line: string): [DayOfWeek, Session] {
  if (!isTrainingDay(line)) {
    throw new Error('Use isTrainingDay to check if line is a training first.')
  }
  const [dayOfWeek, session] = line.split(' ')
  return [dayOfWeek as DayOfWeek, session === '(AM)' ? 'Morning' : 'Afternoon']
}

/**
 * Converts the excel serialized date number (1 Jan 2023 is 44927)
 */
export function excelSerialDate(serialNumber: number): Date {
  return new Date(Math.round((serialNumber - 25569) * 86400 * 1000))
}

/**
 * The one source of truth for human-readable date formats in this project.
 */
export function toStandardDate(date: Date, dayOffset?: number): string {
  const inner = new Date(date)
  inner.setDate(inner.getDate() + (dayOffset || 0))
  return inner.toLocaleDateString('en-sg', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
