import { months } from './types'

const MILLISECONDS_IN_A_DAY = 86400000

/**
 * This offset is a result of JavaScript epoch being 1 Jan 1970 but
 * Excel/Google Sheets have this convention of sticking to 1 Jan 1900
 */
const EXCEL_DAY_OFFSET = 25569

/**
 * Naive check to validate a date.
 */
function validDate(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || 12 < month || day < 1) return false
  if (month === 2) return day === 28 || day === 29
  return day <= [0, 31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
}

/**
 * Anti-timezone date class.
 */
export class Date2 {
  private d: Date

  private constructor(time: number) {
    this.d = new Date(time)
  }

  /**
   * Creates a new Date2 instance
   */
  static from(year: number, month: number, day: number) {
    if (!validDate(month, day)) {
      throw new Error(`Invalid date: ${JSON.stringify({ year, month, day })}`)
    }
    const d = new Date(`${day} ${months[month - 1]}, ${year} GMT`)
    return new Date2(d.getTime())
  }

  /**
   * Creates a Date2 instance from an excel serial number
   */
  static fromExcelSerialNumber(sn: number) {
    if (sn % 1 !== 0) {
      throw new Error('fromExcelSerialNumber() requires an integer parameter.')
    }
    return new Date2((sn - EXCEL_DAY_OFFSET) * MILLISECONDS_IN_A_DAY)
  }

  /**
   * Converts a date to an excel serial number.
   */
  toExcelSerialNumber() {
    return this.d.getTime() / MILLISECONDS_IN_A_DAY + EXCEL_DAY_OFFSET
  }

  /**
   * Checks if the current date is a Monday.
   */
  isMonday() {
    return this.d.getUTCDay() === 1
  }

  /**
   * Assert if it's a monday. Throws if it's not.
   */
  assertMonday() {
    if (!this.isMonday()) {
      throw new Error(`${this} should be a Monday.`)
    }
  }

  day() {
    return this.d.getUTCDay()
  }

  /**
   * Format the date to `MMM DD` (e.g. Jan 20)
   */
  toMMMDD() {
    return `${months[this.d.getUTCMonth()]} ${this.d.getUTCDate()}`
  }

  /**
   * Format the date to `DD/MM/YYYY` with a custom delimiter.
   */
  toDDMMYYYY(delimiter: string = '/') {
    const date = this.d.getUTCDate()
    const month = this.d.getUTCMonth() + 1
    const year = this.d.getUTCFullYear()
    return `${date}${delimiter}${month}${delimiter}${year}`
  }

  /**
   * Format the date to `YYYY/MM/DD` with a custom delimiter.
   * This has to be sort-friendly, and hence the padding.
   */
  toYYYYMMDD(delimiter: string = '/') {
    const date = String(this.d.getUTCDate()).padStart(2, '0')
    const month = String(this.d.getUTCMonth() + 1).padStart(2, '0')
    const year = this.d.getUTCFullYear()
    return `${year}${delimiter}${month}${delimiter}${date}`
  }

  /**
   * Creates a new Date2 instance that is `days` ahead.
   */
  incrementDay(days: number): Date2 {
    return new Date2(this.d.getTime() + days * MILLISECONDS_IN_A_DAY)
  }
}
