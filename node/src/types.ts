import { sheets_v4 } from '@googleapis/sheets'

// prettier-ignore
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
// prettier-ignore
export const daysOfWeek = [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', ] as const

// prettier-ignore
export type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec'
// prettier-ignore
export const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', ] as const

export const sessions = ['AM', 'PM'] as const

export type Session = 'AM' | 'PM'

export type Training = {
  /** excel serial date */
  date: number
  day: DayOfWeek
  session: Session
}

export type TeamMember = {
  nickname: string
  fullName: string
  /** excel serial number */
  birthday?: number
  shirtSize?: string
}


export class GridRange {
  // startRow, endRow, startCol, endCol
  r: [number, number, number, number]

  constructor({ y1 = 0, y2 = 0, x1 = 0, x2 = 0 }) {
    this.r = [y1, y2, x1, x2]
  }

  shift({ y1 = 0, y2 = 0, x1 = 0, x2 = 0 }) {
    return new GridRange({
      y1: y1 + this.r[0],
      y2: y2 + this.r[1],
      x1: x1 + this.r[2],
      x2: x2 + this.r[3],
    })
  }

  toGridRange(sheetId?: number): sheets_v4.Schema$GridRange {
    return {
      sheetId,
      startRowIndex: this.r[0],
      endRowIndex: this.r[1],
      startColumnIndex: this.r[2],
      endColumnIndex: this.r[3],
    }
  }
}

export type AttendanceEntry = {
  /** excel serial date */
  date: number
  session: string
  fullName: string
  nickname: string
  remarks?: string
  boat: string
}

const prettyJson = (v: any) => JSON.stringify(v, null, 2)

export const validate = {
  teamMember: (e: any): TeamMember => {
    if (typeof e.nickname !== 'string')
      throw new Error(`TeamMember must have a nickname: ${prettyJson(e)}`)
    if (typeof e.fullName !== 'string')
      throw new Error(`TeamMember must have a full name: ${prettyJson(e)}`)
    return e as TeamMember
  },
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
    if (typeof e.date === 'string') {
      const parsed = parseInt(e.date)
      if (isNaN(parsed))
        throw new Error(
          `Attendance entry must have a serial number date: ${prettyJson(e)}`
        )
      e.date = parseInt(e.date)
    } else if (typeof e.date !== 'number') {
      throw new Error(`Attendance entry must have a date: ${prettyJson(e)}`)
    }
    return e as AttendanceEntry
  },
}
