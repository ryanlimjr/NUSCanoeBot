import { range } from '../array'
import { parseTrainingHeader } from '../parse'
import { isTrainingDay, parseTrainingDay } from '../string'
import { AttendanceEntry, CellRange, Training, validate } from '../types'
import { Sheet } from './base'

export class AttendanceSheet extends Sheet {
  constructor(data: any[][]) {
    super(data)
  }

  /**
   * Checks if a cell marks the start of one Training's attendance.
   *
   * Returns true if current cell is a Training (e.g. `Monday (AM)`)
   * and cell below is a serial number (that represents a date)
   *
   *  ┌──────────────────────────┐
   *  │Monday (AM)               │ ← [row, col] points to this cell
   *  ├──────────────────────────┤
   *  │2/1/2023                  │
   *  ├───────┬──────────┬───────┤
   *  │Name   │Remarks   │Boat   │
   *  ├───────┼──────────┼───────┤
   *  │Syaz   │          │L8     │
   *  └───────┴──────────┴───────┘
   *
   * Critical characteristics are:
   *  - `Monday` must be a day of the week
   *  - `(AM)` is either AM or PM in brackets. Brackets are required.
   *  - Date must be properly recognized by Google Sheets (any format works)
   *  - `Name`, `Remarks`, `Boat` are exactly those three words.
   */
  private isTrainingRangeStart(row: number, col: number): boolean {
    const cell = this.data[row][col]
    const cellBelow = this.data[row + 1][col]
    return isTrainingDay(cell) && typeof cellBelow === 'number'
  }

  /**
   * Get one attendance entry. This corresponds to one person
   * attending one training.
   */
  private getOneTrainingEntry(
    row: any[],
    headers: string[],
    training: Training,
    members: Record<string, string>
  ): AttendanceEntry | undefined {
    const entry = {
      date: training.date,
      session: training.session,
    } as Record<string, any>
    row = row.map((v) => `${v}`)
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i]

      // handle names differently
      if (key === 'name') {
        // Skip entries with no names. These can be rows at the bottom
        // where no entries are actually there.
        if (!row[i]) return
        if (!members[row[i]]) {
          throw new Error(`Invalid nickname: ${row[i]}`)
        }
        entry['fullName'] = members[row[i]]
        entry['nickname'] = row[i]
        continue
      }

      entry[key] = row[i]
    }
    return validate.attendanceEntry(entry)
  }

  /**
   * Get attendance of one training session.
   */
  private getOneTrainingAttendance(
    training: Training,
    range: CellRange,
    members: Record<string, string>
  ): { entries: AttendanceEntry[]; errors: any[] } {
    const rows = this.slice(range)
    // rows[2] should be ["Name", "Remarks", "Boat"]. Order doesn't matter
    const headers = parseTrainingHeader(rows[2])
    const entries: AttendanceEntry[] = []
    const errors: any[] = []

    rows.slice(3).forEach((row) => {
      try {
        const parsed = this.getOneTrainingEntry(row, headers, training, members)
        if (!parsed) return
        entries.push(parsed)
      } catch (err: any) {
        if (err instanceof Error) {
          errors.push(err.message)
        }
      }
    })
    return { entries, errors }
  }

  /**
   * Parse training attendance from this sheet.
   */
  getAttendance(members: Record<string, string>): AttendanceEntry[] {
    const entries = this.getTrainingCoordinates().flatMap(
      ([training, range]) => {
        const one = this.getOneTrainingAttendance(training, range, members)
        // TODO: send these errors to Telegram or some logfile
        if (one.errors.length > 0) console.log(one.errors)
        return one.entries
      }
    )
    return entries
  }

  /**
   * Obtain a list of training sub-tables within a sheet. Each entry
   * contains information on a training (time, session, date), and
   * where to find it on the sheet.
   */
  private getTrainingCoordinates(): [Training, CellRange][] {
    const trainings: [Training, CellRange][] = []
    const taken = this.createMask(false)
    this.iter({ x1: 0, x2: this.cols, y1: 0, y2: this.rows - 1 }).forEach(
      ([x, y]) => {
        if (this.isTrainingRangeStart(y, x)) {
          const date = this.data[y + 1][x] // date is one cell below
          const [day, session] = parseTrainingDay(this.data[y][x])
          const training = { date, day, session }
          const cellRange = { x1: x, x2: x + 3, y1: y, y2: y + 1 }
          trainings.push([training, cellRange])
          this.iter(cellRange).forEach(([x, y]) => (taken[y][x] = true))
        }
      }
    )

    // expand each training's data capture until it reaches another
    // training or it reaches the end of the sheet.
    trainings.forEach(([_, r]) => {
      while (
        // row is within range
        r.y2 < this.rows &&
        // next row is entirely not taken
        range(r.x1, r.x2).every((x) => !taken[r.y2][x])
      ) {
        // set that row as taken
        range(r.x1, r.x2).forEach((x) => (taken[r.y2][x] = true))
        r.y2 += 1
      }
    })

    return trainings
  }
}
