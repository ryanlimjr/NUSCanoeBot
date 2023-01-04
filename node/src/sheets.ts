import { sheets, auth, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'
import { Sheet } from './sheet'

export const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')
export const SPREADSHEET_IDS = {
  main: '1W_mRwNhylC41bY6Hn5hmeRgUVpAdugsjHEwmoFtd2PM',
}

export class Sheets {
  private core: sheets_v4.Sheets
  private spreadsheetId: string

  /**
   * Initialize a new Sheets instance
   */
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
    this.core = core
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
      .get({
        spreadsheetId: this.spreadsheetId,
      })
      .then((s) => s.data.sheets || [])
  }

  /**
   * Fetch data of one sheet, with an optional range.
   * If no range is provided, then fetch the entire sheet.
   *
   * @param name the name of one sheet within the entire spreadsheet
   * @param range the range of cells to take (e.g. `A2:F9`)
   */
  async getSheet<T extends Sheet>(
    name: string,
    sheetClass: new (data: any[][]) => T,
    range?: string
  ): Promise<T> {
    const res = this.core.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: range ? `${name}!${range}` : name,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
    return res.then((res) => new sheetClass(res.data.values || []))
  }

  /**
   * Moves sheet with ID of `sheetId` to index `index`. Use an index
   * of 1 to move it to the front.
   */
  private async moveSheet(sheetId: number, index: number) {
    const move = {
      updateSheetProperties: {
        properties: { sheetId, index },
        fields: 'index',
      },
    }
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: { requests: [move] },
    } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate)
  }

  /**
   * Obtains the sheet ID of a sheet by its title.
   */
  private getSheetId(sheets: sheets_v4.Schema$Sheet[], title: string): number {
    const sheet = sheets.find((sheet) => sheet.properties?.title === title)
    if (!sheet || !sheet.properties || !sheet.properties.sheetId)
      throw new Error(`Sheet not found: ${title}`)
    return sheet.properties.sheetId
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
            const sheetId = this.getSheetId(spreadsheet.sheets, title)
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
      this.moveSheet(sheetId, 1)
    )
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
  async setHeader(title: string, headers: string[]) {
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
    return this.listSheets()
      .then((sheets) => this.getSheetId(sheets, title))
      .then((sheetId) =>
        this.core.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId,
                    startRowIndex: 0,
                    startColumnIndex: column,
                    endColumnIndex: column + 1,
                  },
                  cell: {
                    userEnteredFormat: {
                      numberFormat: {
                        type: 'DATE',
                        pattern: 'dd-mm-yyyy',
                      },
                    },
                  },
                  fields: 'userEnteredFormat.numberFormat',
                },
              },
            ],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate)
      )
  }

  /**
   * Deletes one sheet but its id.
   */
  async deleteSheetById(sheetId: number) {
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: { requests: [{ deleteSheet: { sheetId } }] },
    } as sheets_v4.Params$Resource$Spreadsheets$Batchupdate)
  }

  /**
   * Deletes one sheet by its title.
   */
  async deleteSheet(title: string) {
    return this.listSheets()
      .then((sheets) => this.getSheetId(sheets, title))
      .then((sheetId) => this.deleteSheetById(sheetId))
      .catch((err) => console.log(`[DELETE SHEET]: ${err}`))
  }
}
