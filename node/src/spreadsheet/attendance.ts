import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'
import {
  AttendanceEntry,
  GridRange,
  DayOfWeek,
  daysOfWeek,
  TeamMember,
  Session,
} from '../types'
import { attendanceSheetTitle, namedRange } from '../string'
import { Date2 } from '../date'
import { Builder, TrainingRange } from '../builder'
import { grid, range } from '../array'

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
  private teamData: TeamMember[]

  constructor(
    core: sheets_v4.Sheets,
    spreadsheetId: string,
    teamData: TeamMember[]
  ) {
    super(core, spreadsheetId)
    this.teamData = teamData
  }

  private TEMPLATE_TITLE = 'Attendance'

  /**
   * Authenticate with Google Sheets API and initialize `Attendance`
   */
  public static async init(
    teamData: TeamMember[],
    spreadsheetId?: string
  ): Promise<Attendance> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new Attendance(core, id, teamData))
  }

  /**
   * Creates a template sheet to build attendance sheets from. These
   * are precisely 11 cells in height and 21 + 1 cells wide.
   */
  async createTemplate(data: (string | null)[][] = []) {
    const template = grid(null, 11, 21)
    for (let i = 0; i < template.length && i < data.length; i++) {
      for (let j = 0; j < template[i].length && j < data[i].length; j++) {
        template[i][j] = data[i][j]
      }
    }
    daysOfWeek.forEach((day, idx) => (template[10][idx * 3] = `${day} (AM)`))
    return this.addSheet(this.TEMPLATE_TITLE, 11, 22, {
      type: 'attendanceTemplate',
    })
      .then(() =>
        this.core.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: this.TEMPLATE_TITLE,
          valueInputOption: 'RAW',
          requestBody: { values: template },
        })
      )
      .then(() => this.formatTemplate())
  }

  /**
   * Formats the template
   */
  async formatTemplate() {
    return this.getSheetId(this.TEMPLATE_TITLE).then((sheetId) => {
      const builder = new Builder(sheetId)
      builder.lockColumn(this.serviceEmail, 21)
      builder.lockRows(this.serviceEmail, [10])
      builder.setDimensionSize('ROWS', 9, 32)
      range(0, 7)
        .map((i) => new GridRange({ x1: i * 3, x2: i * 3 + 3, y1: 10, y2: 11 }))
        .forEach((r) => {
          builder.merge(r)
          builder.merge(r.shift({ y1: -1, y2: -1 }))
          builder.bold(r)
          builder.center(r)
        })

      return builder.execute(this.core, this.spreadsheetId)
    })
  }

  /**
   * Creates an attendance list for the week that begins with Monday
   * `monday`
   */
  async createWeek(monday: Date2) {
    monday.assertMonday()
    const title = attendanceSheetTitle(monday)
    const height = 90
    const width = 22

    const values = Array.apply(null, Array(height)).map(() =>
      Array(width).fill('')
    )
    const merges: GridRange[] = []
    const bolds: GridRange[] = []
    const trainingRanges: TrainingRange[] = []

    const row = { AM: 10, PM: 50 }
    const templateId = await this.getSheetId(this.TEMPLATE_TITLE)

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
        merges.push(new GridRange({ x1: x, x2: x + 3, y1: y, y2: y + 1 }))
        // merge training date cells
        merges.push(new GridRange({ x1: x, x2: x + 3, y1: y + 1, y2: y + 2 }))

        // bold "Name", "Remarks", "Boat"
        bolds.push(new GridRange({ x1: x, x2: x + 3, y1: y + 2, y2: y + 3 }))

        trainingRanges.push({
          date: monday.incrementDay(idx),
          session,
          range: new GridRange(
            session === 'AM'
              ? { x1: x, x2: x + 3, y1: row.AM + 3, y2: row.PM - 1 }
              : { x1: x, x2: x + 3, y1: row.PM + 3, y2: height - 1 }
          ),
        })
      })

    return this.addSheet(title, height, width, {
      type: 'attendance',
      weekStart: monday.toYYYYMMDD(''),
    })
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
        merges.forEach((r) => {
          builder.merge(r)
          builder.bold(r)
          builder.center(r)
        })
        bolds.forEach((r) => builder.bold(r))
        trainingRanges.forEach((r) => {
          builder.name(r)
          builder.color(r)
          builder.allBorder(r.range.shift({ y1: -3 }))
          builder.validateNicknames(r, this.teamData)
        })
        builder.loadTemplate(
          templateId,
          new GridRange({ x1: 0, x2: 21, y1: 0, y2: 10 })
        )
        builder.lockColumn(this.serviceEmail, width - 1)
        builder.lockRows(this.serviceEmail, [row.AM, row.PM], 3)
        return builder.execute(this.core, this.spreadsheetId)
      })
      .then(() => this.setPosition(monday))
  }

  /**
   * Deletes an attendance sheet by week.
   */
  async deleteWeek(monday: Date2) {
    monday.assertMonday()
    return this.deleteSheet(attendanceSheetTitle(monday))
  }

  /**
   * Get attendance of the week that starts with the Monday `monday`
   */
  async getAttendance(monday: Date2): Promise<[AttendanceEntry[], string[]]> {
    monday.assertMonday()
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
              const member = this.teamData.find((v) => v.nickname === nickname)
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

  /**
   * Sets the position of the attendance sheet that starts on `monday`
   * to the right of the template sheet.
   */
  async setPosition(monday: Date2) {
    const att = await this.getSheetByMeta('weekStart', monday.toYYYYMMDD(''))
    const target = await this.getSheetByMeta('type', 'attendanceTemplate')
    const attId = att.properties?.sheetId
    const targetIndex = target.properties?.index
    if (!attId || !targetIndex) return
    const builder = new Builder(attId)
    builder.moveToIndex(targetIndex + 1)
    return builder.execute(this.core, this.spreadsheetId)
  }

  /**
   * Populates the attendance sheet with some data
   * @param data should be an array of [<name>, <remarks>, <boat>]
   * elements. Use `null` to skip a cell.
   */
  async __mockData__(date: Date2, data: (string | null)[][]) {
    return this.core.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      valueInputOption: 'RAW',
      range: namedRange(date, 'AM'),
      requestBody: { values: data },
    })
  }
}
