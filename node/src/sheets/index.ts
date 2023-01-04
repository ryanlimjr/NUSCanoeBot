import { sheets, auth, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'
import { Sheet } from '../sheet'
import { CellRange, daysOfWeek } from '../types'
import { SheetsById } from './id-operations'

const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')
const SPREADSHEET_IDS = {
  main: '1W_mRwNhylC41bY6Hn5hmeRgUVpAdugsjHEwmoFtd2PM',
}

export class Sheets extends SheetsById {
  /**
   * Initialize a new Sheets instance
   */
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  /**
   * Authenticate and initialize a working Sheets instance.
   * Call with no options to use the default values.
   *
   * @param keyFile Path to a .json, .pem, or .p12 key file
   * @param spreadsheetId ID of the main spreadsheet
   */
  static async init(keyFile?: string, spreadsheetId?: string): Promise<Sheets> {
    // fill in default values
    keyFile = keyFile ? keyFile : CREDENTIALS_PATH
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    // authenticate and get client
    const scopes = ['https://www.googleapis.com/auth/spreadsheets']
    const getClient = auth.getClient({ keyFile, scopes })
    const core = getClient.then((auth) => sheets({ version: 'v4', auth }))
    return core.then((core) => new Sheets(core, id))
  }

  /**
   * List all sheets under the spreadsheet of ID `this.spreadsheetId`
   */
  async listSheets() {
    return this.core.spreadsheets
      .get({ spreadsheetId: this.spreadsheetId })
      .then((s) => s.data.sheets || [])
  }

  /**
   * Gets a raw sheet.
   */
  async getSheetRaw(title: string, range?: string) {
    return this.core.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: range ? `${title}!${range}` : title,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
  }

  /**
   * Fetch data of one sheet, with an optional range.
   * If no range is provided, then fetch the entire sheet.
   *
   * @param name the name of one sheet within the entire spreadsheet
   * @param range the range of cells to take (e.g. `A2:F9`)
   */
  async getSheet<T extends Sheet>(
    title: string,
    sheetClass: new (data: any[][]) => T,
    range?: string
  ): Promise<T> {
    return this.getSheetRaw(title, range).then(
      (res) => new sheetClass(res.data.values || [])
    )
  }

  /**
   * Obtains the sheet ID of a sheet by its title.
   */
  private async getSheetId(
    title: string,
    sheets?: sheets_v4.Schema$Sheet[]
  ): Promise<number> {
    const getSheets: Promise<sheets_v4.Schema$Sheet[]> = sheets
      ? new Promise((res) => res(sheets))
      : this.listSheets()
    return getSheets
      .then((sheets) => sheets.find((s) => s.properties?.title === title))
      .then(
        (sheet) =>
          new Promise((res, rej) =>
            sheet?.properties?.sheetId
              ? res(sheet.properties.sheetId)
              : rej(`Sheet not found: ${title}`)
          )
      )
  }

  /**
   * Adds a sheet to the spreadsheet defined by `this.spreadsheetId`
   * and returns its sheet id.
   */
  private async addSheet(
    title: string,
    rowCount: number,
    columnCount: number
  ): Promise<number> {
    const properties = { title, gridProperties: { rowCount, columnCount } }
    return this.core.spreadsheets
      .batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{ addSheet: { properties } }],
          includeSpreadsheetInResponse: true,
        },
      } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate)
      .then(
        (response) =>
          new Promise((resolve, reject) => {
            const spreadsheet = response.data.updatedSpreadsheet
            if (!spreadsheet)
              return reject('Spreadsheet not updated. No sheet created.')
            if (!spreadsheet.sheets)
              return reject('No sheets found or created.')
            const sheetId = this.getSheetId(title, spreadsheet.sheets)
            if (!sheetId) return reject(`Sheet ${title} has no ID.`)
            return resolve(sheetId)
          })
      )
  }

  /**
   * Creates a new sheet and moves it to the front, such that it is
   * visible immediately to the Google Sheet's front-end user.
   */
  async addSheetToFront(title: string, rowCount: number, columnCount: number) {
    return this.addSheet(title, rowCount, columnCount).then((sheetId) =>
      this.moveSheetById(sheetId, 1)
    )
  }

  /**
   * Appends a row to an existing sheet. This assumes that the sheet
   * has a header row, which it will use as keys to map the data into.
   */
  async appendRows(title: string, data: Record<string, any>[]) {
    return this.getSheetRaw(title)
      .then((raw) => {
        const sheet = new Sheet(raw.data.values || [])
        const headers = sheet.getHeaders()
        const newRows = data.map((row) => headers.map((key) => row[key]))
        return newRows
      })
      .then((values) =>
        this.core.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          valueInputOption: 'RAW',
          range: title,
          requestBody: { majorDimension: 'ROWS', values },
        })
      )
  }

  /**
   * Sets the header of a sheet.
   */
  async setHeaders(title: string, headers: string[]) {
    return this.core.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      valueInputOption: 'RAW',
      range: title,
      requestBody: { majorDimension: 'ROWS', values: [headers] },
    })
  }

  /**
   * In the sheet titled `title`, find the column with header
   * `matchHeader` and set its formatting to DD-MM-YYYY
   */
  async setDateColumn(title: string, column: number) {
    return this.getSheetId(title).then((sheetId) =>
      this.setDateColumnById(sheetId, column)
    )
  }

  /**
   * Deletes one sheet by its title.
   */
  async deleteSheet(title: string) {
    return this.getSheetId(title)
      .then((sheetId) => this.deleteSheetById(sheetId))
      .catch((err) => console.log(`[DELETE SHEET]: ${err}`))
  }

  /**
   * Moves a sheet to the front.
   */
  async moveToFront(title: string) {
    return this.getSheetId(title).then((id) => this.moveSheetById(id, 1))
  }

  async __createAttendance__(title: string) {
    const values = Array.apply(null, Array(100)).map(() => Array(21).fill(''))
    const merges: CellRange[] = []
    const row = { AM: 10, PM: 50 }
    daysOfWeek.forEach((day, idx) => {
      const x = idx * 3
      values[row.AM][x] = `${day.toUpperCase()} (AM)`
      merges.push({ x1: x, x2: x + 3, y1: row.AM, y2: row.AM + 1 })
      if (!(day === 'Saturday' || day === 'Sunday')) {
        values[row.PM][x] = `${day.toUpperCase()} (PM)`
        merges.push({ x1: x, x2: x + 3, y1: row.PM, y2: row.PM + 1 })
      }
    })

    const boldAndCenter = (sheetId: number, rows: number[]) =>
      rows.map((row) => ({
        repeatCell: {
          range: { sheetId, startRowIndex: row, endRowIndex: row + 1 },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: 'CENTER',
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
        },
      }))

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
          resource: {
            requests: [
              ...merges.map((range) => ({
                mergeCells: {
                  range: {
                    sheetId,
                    startRowIndex: range.y1,
                    endRowIndex: range.y2,
                    startColumnIndex: range.x1,
                    endColumnIndex: range.x2,
                  },
                },
              })),
              ...boldAndCenter(sheetId, [row.AM, row.PM]),
            ],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate)
      )
  }
}
