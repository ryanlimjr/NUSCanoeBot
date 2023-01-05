import { months } from './types'

/**
 * Anti-timezone date class.
 */
export class Date2 {
  d: Date

  private constructor(time: number) {
    this.d = new Date(time)
  }

  /**
   * Creates a new Date2 instance
   */
  static from(year: number, month: number, day: number) {
    if (!(1 <= month && month <= 12)) {
      throw new Error('Date2.from() expects a month between [1, 12]')
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
    return new Date2((sn - 25569) * 86400000)
  }

  /**
   * Converts a date to an excel serial number.
   */
  toExcelSerialNumber() {
    return this.d.getTime() / 86400000 + 25569
  }

  /**
   * Checks if the current date is a Monday.
   */
  isMonday() {
    return this.d.getUTCDay() === 0
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
   * Creates a new Date2 instance that is `days` ahead.
   */
  incrementDay(days: number): Date2 {
    return new Date2(this.d.getTime() + days * 86400000)
  }
}
