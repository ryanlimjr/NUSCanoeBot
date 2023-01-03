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
 * Takes in a sheet in ROW major setting. This means that `sheets[0]`
 * refers to the first row, and `sheets[0][0]` refers to the cell A1.
 *
 * This function assumes that each training is recorded as such:
 *
 * ┌──────────────────────────┐
 * │Monday (AM)               │
 * ├──────────────────────────┤
 * │2/1/2023                  │
 * ├───────┬──────────┬───────┤
 * │Name   │Remarks   │Boat   │
 * ├───────┼──────────┼───────┤
 * │Syaz   │          │L8     │
 * └───────┴──────────┴───────┘
 *
 * Critical characteristics are:
 *  - `Monday` must be a day of the week
 *  - `(AM)` is either AM or PM in brackets. Brackets are required.
 *  - Date must be properly recognized by Google Sheets
 *  - `Name`, `Remarks`, `Boat` are exactly those three words.
 *
 *  @return a record where keys are the unique nicknames, and the
 *  values are the trainings that the person came for training.
 */
export function parseAttendanceSheet(sheet: any[][]): Record<string, number[]> {
  for (let i = 0; i < 10; i++) {
    sheet.shift()
  }
  console.log(sheet)
  return {}
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
 * Checks if the (row, col) cell of the sheet marks the start of a
 * training attendance list
 */
export function isAttendanceStart(cell: any, cellBelow: any): boolean {
  return isTrainingDay(cell) && !isNaN(cellBelow)
}

/**
 * Converts the excel serialized date number (1 Jan 2023 is 44927)
 */
export function excelSerialDate(serialNumber: number): Date {
  return new Date(Math.round((serialNumber - 25569) * 86400 * 1000))
}
