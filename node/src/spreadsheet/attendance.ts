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
    const height = 100
    const width = 22

    const values = Array.apply(null, Array(height)).map(() =>
      Array(width).fill('')
    )
    const merges: CellRange[] = []
    const bolds: CellRange[] = []
    const namedRanges: [Date2, Session, CellRange][] = []

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

        namedRanges.push([
          monday.incrementDay(idx),
          session,
          session === 'AM'
            ? { x1: x, x2: x + 3, y1: row.AM + 3, y2: row.PM - 2 }
            : { x1: x, x2: x + 3, y1: row.PM + 3, y2: height - 1 },
        ])
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
      .then((sheetId) =>
        this.core.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              ...merges.map(
                (range): sheets_v4.Schema$Request => ({
                  mergeCells: { range: toGridRange(range, sheetId) },
                })
              ),
              ...merges.map(
                (range): sheets_v4.Schema$Request => ({
                  repeatCell: {
                    range: toGridRange(range, sheetId),
                    cell: {
                      userEnteredFormat: {
                        horizontalAlignment: 'CENTER',
                        textFormat: { bold: true },
                      },
                    },
                    fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
                  },
                })
              ),
              ...bolds.map(
                (range): sheets_v4.Schema$Request => ({
                  repeatCell: {
                    range: toGridRange(range, sheetId),
                    cell: { userEnteredFormat: { textFormat: { bold: true } } },
                    fields: 'userEnteredFormat.textFormat',
                  },
                })
              ),
              ...namedRanges.map(
                ([date, session, range]): sheets_v4.Schema$Request => ({
                  addNamedRange: {
                    namedRange: {
                      name: namedRange(date, session),
                      range: toGridRange(range, sheetId),
                    },
                  },
                })
              ),
              // color the entry cells
              ...namedRanges.map(
                ([date, _, range]): sheets_v4.Schema$Request => ({
                  repeatCell: {
                    range: toGridRange(range, sheetId),
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
              ),
              // copy-paste the template header over
              {
                copyPaste: {
                  source: {
                    sheetId: templateId,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 21,
                  },
                  destination: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 21,
                  },
                  pasteType: 'PASTE_NORMAL',
                  pasteOrientation: 'NORMAL',
                },
              },
              // add borders to each training
              ...namedRanges.map(([_, __, r]): sheets_v4.Schema$Request => {
                const range = { ...r, y1: r.y1 - 3 }
                const borderStyle = {
                  style: 'SOLID',
                  colorStyle: { rgbColor: { red: 0, green: 0, blue: 0 } },
                }
                return {
                  updateBorders: {
                    range: toGridRange(range, sheetId),
                    top: borderStyle,
                    bottom: borderStyle,
                    right: borderStyle,
                    left: borderStyle,
                    innerHorizontal: borderStyle,
                    innerVertical: borderStyle,
                  },
                }
              }),
              // data validation for nicknames
              ...namedRanges.map(([_, __, r]): sheets_v4.Schema$Request => {
                const range = { ...r, x2: r.x1 + 1 }
                return {
                  setDataValidation: {
                    range: toGridRange(range, sheetId),
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
                }
              }),
              // create a hidden dummy column at the end to protect
              {
                updateDimensionProperties: {
                  range: {
                    sheetId,
                    dimension: 'COLUMNS',
                    startIndex: width - 1,
                    endIndex: width,
                  },
                  properties: { pixelSize: 1, hiddenByUser: true },
                  fields: 'pixelSize,hiddenByUser',
                },
              },
              // prevent new rows from being added
              {
                addProtectedRange: {
                  protectedRange: {
                    range: {
                      sheetId,
                      startColumnIndex: width - 1,
                      endColumnIndex: width,
                    },
                    editors: { users: [this.serviceEmail] },
                    description: 'Protect sheet height.',
                  },
                },
              },
              // prevent new columns from being added
              {
                addProtectedRange: {
                  protectedRange: {
                    range: {
                      sheetId,
                      startRowIndex: row.AM,
                      endRowIndex: row.AM + 3,
                    },
                    editors: { users: [this.serviceEmail] },
                    description: 'Protect sheet width.',
                  },
                },
              },
              // prevent new columns from being added
              {
                addProtectedRange: {
                  protectedRange: {
                    range: {
                      sheetId,
                      startRowIndex: row.PM,
                      endRowIndex: row.PM + 3,
                    },
                    editors: { users: [this.serviceEmail] },
                    description: 'Protect sheet width.',
                  },
                },
              },
            ],
          },
        })
      )
      .then(() => title)
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
