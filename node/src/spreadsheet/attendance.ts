import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'
import {
  AttendanceEntry,
  CellRange,
  DayOfWeek,
  daysOfWeek,
  TeamMember,
  toGridRange,
  Session,
} from '../types'
import { attendanceSheetTitle, namedRange } from '../string'
import { Date2 } from '../date'

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

type TrainingRange = {
  date: Date2
  session: Session
  range: CellRange
}

/**
 * A helper class to build a weekly attendance list.
 */
class Builder {
  requests: sheets_v4.Schema$Request[]
  sheetId: number

  constructor(sheetId: number) {
    this.sheetId = sheetId
    this.requests = []
  }

  private toGridRange(range: CellRange, sheetId: number = this.sheetId) {
    return toGridRange(range, sheetId)
  }

  private add(request: sheets_v4.Schema$Request) {
    this.requests.push(request)
  }

  lockDimensions(width: number, email: string, trainingRows: number[]) {
    this.add({
      updateDimensionProperties: {
        range: {
          sheetId: this.sheetId,
          dimension: 'COLUMNS',
          startIndex: width - 1,
          endIndex: width,
        },
        properties: { pixelSize: 1, hiddenByUser: true },
        fields: 'pixelSize,hiddenByUser',
      },
    })
    const ranges: sheets_v4.Schema$GridRange[] = []
    trainingRows.forEach((row) => {
      ranges.push({
        sheetId: this.sheetId,
        startRowIndex: row,
        endRowIndex: row + 3,
      })
    })
    ranges.push({
      sheetId: this.sheetId,
      startColumnIndex: width - 1,
      endColumnIndex: width,
    })
    ranges.forEach((range) => {
      this.add({
        addProtectedRange: {
          protectedRange: { range, editors: { users: [email] } },
        },
      })
    })
  }

  mergeBoldCenter(range: CellRange) {
    this.add({ mergeCells: { range: this.toGridRange(range) } })
    this.add({
      repeatCell: {
        range: this.toGridRange(range),
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
      },
    })
  }

  bold(range: CellRange) {
    this.add({
      repeatCell: {
        range: this.toGridRange(range),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat',
      },
    })
  }

  name(trainingRange: TrainingRange) {
    const { range, session, date } = trainingRange
    this.add({
      addNamedRange: {
        namedRange: {
          name: namedRange(date, session),
          range: this.toGridRange(range),
        },
      },
    })
  }

  color(trainingRange: TrainingRange) {
    const { range, date } = trainingRange
    this.add({
      repeatCell: {
        range: this.toGridRange(range),
        cell: {
          userEnteredFormat: {
            backgroundColor: [2, 4, 6].includes(date.day())
              ? {
                  red: 0.64,
                  green: 0.76,
                  blue: 0.96,
                }
              : {
                  red: 0.95,
                  green: 0.76,
                  blue: 0.2,
                },
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  loadTemplate(templateSheetId: number, range: CellRange) {
    this.add({
      copyPaste: {
        source: this.toGridRange(range, templateSheetId),
        destination: this.toGridRange(range),
        pasteType: 'PASTE_NORMAL',
        pasteOrientation: 'NORMAL',
      },
    })
  }

  allBorder(trainingRange: TrainingRange) {
    const range = { ...trainingRange.range, y1: trainingRange.range.y1 - 3 }
    const gray = 0.2
    const borderStyle = {
      style: 'SOLID',
      colorStyle: { rgbColor: { red: gray, green: gray, blue: gray } },
    }
    this.add({
      updateBorders: {
        range: this.toGridRange(range),
        top: borderStyle,
        bottom: borderStyle,
        right: borderStyle,
        left: borderStyle,
        innerHorizontal: borderStyle,
        innerVertical: borderStyle,
      },
    })
  }

  validateNicknames(trainingRange: TrainingRange, team: TeamMember[]) {
    const range = { ...trainingRange.range, x2: trainingRange.range.x1 + 1 }
    this.add({
      setDataValidation: {
        range: this.toGridRange(range),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: team.map((m) => ({
              userEnteredValue: m.nickname,
            })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    })
  }

  async build(core: sheets_v4.Sheets, spreadsheetId: string) {
    return core.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: this.requests },
    })
  }
}

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
