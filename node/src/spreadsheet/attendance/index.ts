import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from '../base'
import {
  AttendanceEntry,
  CellRange,
  DayOfWeek,
  daysOfWeek,
  TeamMember,
  Session,
} from '../../types'
import { attendanceSheetTitle, namedRange } from '../../string'
import { Date2 } from '../../date'
import { Builder, TrainingRange } from './builder'

const trainingDays: { day: DayOfWeek; session: Session }[] = [
  // Days with Morning Training
  { day: 'Monday', session: 'AM' },
  { day: 'Tuesday', session: 'AM' },
  { day: 'Wednesday', session: 'AM' },
  { day: 'Thursday', session: 'AM' },
  { day: 'Friday', session: 'AM' },
  { day: 'Saturday', session: 'AM' },
  { day: 'Sunday', session: 'AM' },
  // Days with Afternoon Training
  { day: 'Monday', session: 'PM' },
  { day: 'Tuesday', session: 'PM' },
  { day: 'Wednesday', session: 'PM' },
  { day: 'Thursday', session: 'PM' },
  { day: 'Friday', session: 'PM' },
]

/**
 * Builds on top of the `Spreadsheet` class to form an ergonomic
 * builder for the weekly attendance sheet.
 */
export class Attendance extends Spreadsheet {
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  /**
   * Authenticate with Google Sheets API and initialize `Attendance`
   */
  public static async init(spreadsheetId?: string): Promise<Attendance> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new Attendance(core, id))
  }

  /**
   * Creates an attendance list for the week that begins with Monday
   * `monday`
   */
  async createWeek(monday: Date2, team: TeamMember[]) {
    const title = attendanceSheetTitle(monday)
    const height = 90
    const width = 22

    const values = Array.apply(null, Array(height)).map(() =>
      Array(width).fill('')
    )
    const merges: CellRange[] = []
    const bolds: CellRange[] = []
    const trainingRanges: TrainingRange[] = []

    const row = { AM: 10, PM: 50 }
    const templateId = await this.getSheetId('Weekly Template')

    trainingDays
      .map((t) => ({ ...t, y: t.session === 'AM' ? row.AM : row.PM }))
      .forEach(({ day, session, y }) => {
        const idx = daysOfWeek.indexOf(day)
        const x = idx * 3
        values[y][x] = `${day} (${session})`
        values[y + 1][x] = monday.incrementDay(idx).toDDMMYYYY()
        values[y + 2][x] = 'Name'
        values[y + 2][x + 1] = 'Remarks'
        values[y + 2][x + 2] = 'Boat'

        // merge training day cells
        merges.push({ x1: x, x2: x + 3, y1: y, y2: y + 1 })
        // merge training date cells
        merges.push({ x1: x, x2: x + 3, y1: y + 1, y2: y + 2 })

        // bold "Name", "Remarks", "Boat"
        bolds.push({ x1: x, x2: x + 3, y1: y + 2, y2: y + 3 })

        trainingRanges.push({
          date: monday.incrementDay(idx),
          session,
          range:
            session === 'AM'
              ? { x1: x, x2: x + 3, y1: row.AM + 3, y2: row.PM - 1 }
              : { x1: x, x2: x + 3, y1: row.PM + 3, y2: height - 1 },
        })
      })

    return this.addSheet(title, height, width, { type: 'attendance' })
      .then((sheetId) =>
        this.core.spreadsheets.values
          .update({
            spreadsheetId: this.spreadsheetId,
            range: title,
            valueInputOption: 'RAW',
            requestBody: { values },
          })
          .then(() => sheetId)
      )
      .then(async (sheetId) => {
        const builder = new Builder(sheetId)
        merges.forEach((r) => builder.mergeBoldCenter(r))
        bolds.forEach((r) => builder.bold(r))
        trainingRanges.forEach((r) => {
          builder.name(r)
          builder.color(r)
          builder.allBorder(r)
          builder.validateNicknames(r, team)
        })
        builder.loadTemplate(templateId, { x1: 0, x2: 21, y1: 0, y2: 10 })
        builder.lockDimensions(width, this.serviceEmail, [row.AM, row.PM])
        return builder.build(this.core, this.spreadsheetId)
      })
  }

  /**
   * Get attendance of the week that starts with the Monday `monday`
   */
  async getAttendance(
    monday: Date2,
    team: TeamMember[]
  ): Promise<[AttendanceEntry[], string[]]> {
    if (!monday.isMonday()) {
      throw new Error(`${monday} should be a Monday.`)
    }
    return this.core.spreadsheets.values
      .batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: trainingDays.map(({ day, session }) => {
          const offset = daysOfWeek.indexOf(day)
          return namedRange(monday.incrementDay(offset), session)
        }),
        majorDimension: 'ROWS',
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'SERIAL_NUMBER',
      })
      .then((res) => {
        const attendance: AttendanceEntry[] = []
        const errors: string[] = []
        if (!res.data.valueRanges) return [attendance, []]
        res.data.valueRanges.forEach(({ values }, idx) => {
          const training = trainingDays[idx]
          const date = monday.incrementDay(daysOfWeek.indexOf(training.day))
          if (!values) return
          values
            .filter((row) => row.length > 0)
            .forEach((row) => {
              const [nickname, remarks, boat] = row.map((v) => `${v}`.trim())
              const member = team.find((v) => v.nickname === nickname)
              if (!member) {
                errors.push(
                  `Member "${nickname}" not found: ${JSON.stringify(row)}`
                )
                return
              }
              attendance.push({
                nickname,
                fullName: member.fullName,
                date: date.toExcelSerialNumber(),
                session: training.session,
                boat,
                remarks,
              })
            })
        })
        return [attendance, errors]
      })
  }
}
