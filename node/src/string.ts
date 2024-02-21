import { Date2 } from './date'
import { DayOfWeek, daysOfWeek, Session } from './types'

/**
 * Retrieves an environment variable and throws if not found.
 */
export function envOrThrow(env: string): string {
  const value = process.env[env]
  if (value == undefined)
    throw new Error(`Environment variable expected but not found: ${env}`)
  return value
}

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
  return [dayOfWeek as DayOfWeek, session === '(AM)' ? 'AM' : 'PM']
}

/**
 * Standard titles for all attendance sheets, generated from the monday that
 * that week starts with.
 */
export function attendanceSheetTitle(monday: Date2): string {
  // assert that the date provided is in fact a monday
  if (!monday.isMonday()) {
    throw new Error(`${monday} should be a Monday.`)
  }
  return `${monday.toMMMDD()} - ${monday.incrementDay(6).toMMMDD()}`
}

/**
 * Standard named range name for a training that happened on `date`, `session`
 */
export function namedRange(date: Date2, session: Session) {
  return `T.${date.toDDMMYYYY('.')}.${session}`
}
