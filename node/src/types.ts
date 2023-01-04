export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const sessions = ['Morning', 'Afternoon'] as const

export type Session = 'Morning' | 'Afternoon'

export type Training = {
  /** excel serial date */
  date: number
  day: DayOfWeek
  session: Session
}

export type CellRange = {
  /** left-most column (inclusive) */
  x1: number
  /** right-most column (exclusive) */
  x2: number
  /** left-most row (inclusive) */
  y1: number
  /** right-most row (exclusive) */
  y2: number
}

export type AttendanceEntry = {
  /** excel serial date */
  date: number
  fullName: string
  nickname: string
  remarks?: string
  boat: string
}

const prettyJson = (v: any) => JSON.stringify(v, null, 2)

export const validate = {
  attendanceEntry: (e: any): AttendanceEntry => {
    if (typeof e.boat !== 'string') {
      throw new Error(
        `Attendance entry must have a boat allocated: ${prettyJson(e)}`
      )
    }
    if (typeof e.fullName !== 'string' || e.fullName === '') {
      throw new Error(`Attendance entry must have a name: ${prettyJson(e)}`)
    }
    if (typeof e.nickname !== 'string' || e.nickname === '') {
      throw new Error(`Attendance entry must have a nickname: ${prettyJson(e)}`)
    }
    if (typeof e.date !== 'number') {
      throw new Error(`Attendance entry must have a date: ${prettyJson(e)}`)
    }
    return e as AttendanceEntry
  },
}
