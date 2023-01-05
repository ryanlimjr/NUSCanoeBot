import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet } from '.'
import { CellRange, daysOfWeek } from '../types'
import { SpreadsheetById } from './id-operations'

export class AttendanceBuilder extends Spreadsheet {
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  public static async init(spreadsheetId?: string): Promise<AttendanceBuilder> {
    const id = spreadsheetId
      ? spreadsheetId
      : SpreadsheetById.SPREADSHEET_IDS.main
    return SpreadsheetById.initCore().then(
      (core) => new AttendanceBuilder(core, id)
    )
  }

  async __createAttendance__(title: string) {
    const values = Array.apply(null, Array(100)).map(() => Array(21).fill(''))
    const merges: CellRange[] = []

    const row = { AM: 10, PM: 50 }
    daysOfWeek
      .map((v) => v.toUpperCase())
      .forEach((day, idx) => {
        const x = idx * 3
        values[row.AM][x] = `${day} (AM)`
        merges.push({ x1: x, x2: x + 3, y1: row.AM, y2: row.AM + 1 })
        // No afternoon session on Saturday/Sunday
        if (!(day === 'Saturday' || day === 'Sunday')) {
          values[row.PM][x] = `${day} (PM)`
          merges.push({ x1: x, x2: x + 3, y1: row.PM, y2: row.PM + 1 })
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
                  mergeCells: {
                    range: {
                      sheetId,
                      startRowIndex: range.y1,
                      endRowIndex: range.y2,
                      startColumnIndex: range.x1,
                      endColumnIndex: range.x2,
                    },
                  },
                })
              ),
              ...[row.AM, row.PM].map(
                (row): sheets_v4.Schema$Request => ({
                  repeatCell: {
                    range: {
                      sheetId,
                      startRowIndex: row,
                      endRowIndex: row + 1,
                    },
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
            ],
          },
        })
      )
  }
}
