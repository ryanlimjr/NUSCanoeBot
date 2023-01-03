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

export type Session = 'Morning' | 'Afternoon'

export type Training = {
  day: DayOfWeek
  /** excel serial date */
  date: number
  timeOfDay: Session
}

export type CellRange = {
  /** left-most column */
  x1: number
  /** right-most column */
  x2: number
  /** right-most row */
  y1: number
  /** left-most row */
  y2: number
}
