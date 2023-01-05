import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'
import { CellRange, daysOfWeek, toGridRange, Session } from '../types'
import { toStandardDate } from '../string'

/**
 * Builds on top of the `Spreadsheet` class to form an ergonomic
 * builder for the weekly attendance sheet.
 */
export class AttendanceBuilder extends Spreadsheet {
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  /**
   * Authenticate with Google Sheets API and initialize
   * `AttendanceBuilder`
   */
  public static async init(spreadsheetId?: string): Promise<AttendanceBuilder> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new AttendanceBuilder(core, id))
  }

  async __createAttendance__(title: string, monday: Date) {
    // check if the monday provided is in fact a monday
    if (monday.getDay() !== 0) {
      throw new Error(
        `${monday.toLocaleDateString('en-sg')} should be a Monday.`
      )
    }

    const height = 100
    const width = 21
    const values = Array.apply(null, Array(height)).map(() =>
      Array(width).fill('')
    )
    const merges: CellRange[] = []
    const namedRanges: [string, CellRange][] = []

    const namedRange = (d: Date, offset: number, session: string) =>
      `T.${toStandardDate(d, offset).replace(/\//g, '.')}.${session}`

    const row = { AM: 10, PM: 50 }
    daysOfWeek
      .map((v) => v.toUpperCase())
      .forEach((day, idx) => {
        const x = idx * 3
        values[row.AM][x] = `${day} (AM)`
        merges.push({ x1: x, x2: x + 3, y1: row.AM, y2: row.AM + 1 })
        namedRanges.push([
          namedRange(monday, idx, 'AM'),
          { x1: x, x2: x + 3, y1: row.AM, y2: row.PM },
        ])

        // No afternoon session on Saturday/Sunday
        if (!(day === 'Saturday' || day === 'Sunday')) {
          values[row.PM][x] = `${day} (PM)`
          merges.push({ x1: x, x2: x + 3, y1: row.PM, y2: row.PM + 1 })
          namedRanges.push([
            namedRange(monday, idx, 'PM'),
            { x1: x, x2: x + 3, y1: row.PM, y2: height },
          ])
        }
      })

    return this.addSheet(title, 100, 21)
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
              ...namedRanges.map(
                ([name, range]): sheets_v4.Schema$Request => ({
                  addNamedRange: {
                    namedRange: { name, range: toGridRange(range, sheetId) },
                  },
                })
              ),
            ],
          },
        })
      )
  }
}
