import { auth, sheets, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'
import { camelCaseify } from '../string'

export const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')
export const SPREADSHEET_IDS = {
  main: '1FGaXn4gvXpr6E-b4JO4O2pZk43jHpxvZHPJtN5SJc88',
}

/**
 * Authenticate and initialize a working Sheets instance.
 * Call with no options to use the default values.
 *
 * @param keyFile Path to a .json, .pem, or .p12 key file
 * @param spreadsheetId ID of the main spreadsheet
 */
export async function initCore(keyFile?: string): Promise<sheets_v4.Sheets> {
  // fill in default values
  keyFile = keyFile ? keyFile : CREDENTIALS_PATH
  // authenticate and get client
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return auth
    .getClient({ keyFile, scopes })
    .then((auth) => sheets({ version: 'v4', auth }))
}

/**
 * Relatively low-level sheet operations that rely on having the ID
 */
class SpreadsheetById {
  protected core: sheets_v4.Sheets
  protected spreadsheetId: string

  /**
   * Initialize a new Sheets instance
   */
  protected constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
    this.core = core
  }

  /**
   * List all sheets under the spreadsheet
   */
  async listSheets() {
    return this.core.spreadsheets
      .get({ spreadsheetId: this.spreadsheetId })
      .then((s) => s.data.sheets || [])
  }

  /**
   * List all named ranges under the spreadsheet. Note that the
   * namespace of ranges span the entire spreadsheet, and not just one
   * sheet.
   */
  async listNamedRanges() {
    return this.core.spreadsheets
      .get({ spreadsheetId: this.spreadsheetId })
      .then((s) => {
        return s.data.namedRanges || []
      })
  }

  /**
   * Deletes all named ranges.
   */
  async clearNamedRanges() {
    return this.listNamedRanges().then((namedRanges) =>
      namedRanges.length > 0
        ? this.core.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: namedRanges.map(
                (r): sheets_v4.Schema$Request => ({
                  deleteNamedRange: { namedRangeId: r.namedRangeId },
                })
              ),
            },
          })
        : null
    )
  }

  /**
   * Delete rows starting from `startRow` (inclusive) to `endRow` (exclusive)
   */
  async deleteRowsById(sheetId: number, startIndex: number, endIndex: number) {
    if (startIndex >= endIndex) return
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex, endIndex },
            },
          },
        ],
      },
    })
  }

  /**
   * Deletes one sheet but its id.
   */
  protected async deleteSheetById(sheetId: number) {
    // delete related named ranges so none are left hanging
    const getNamedRangeIds = this.listNamedRanges().then((ranges) =>
      ranges
        .filter((range) => range.range?.sheetId === sheetId)
        .map((r) => r.namedRangeId || '')
        .filter((id) => id.length > 0)
    )
    return getNamedRangeIds.then((namedRangeIds) =>
      this.core.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            ...namedRangeIds.map(
              (id): sheets_v4.Schema$Request => ({
                deleteNamedRange: { namedRangeId: id },
              })
            ),
            { deleteSheet: { sheetId } },
          ],
        },
      })
    )
  }

  /**
   * Moves sheet with ID of `sheetId` to index `index`. Use an index
   * of 1 to move it to the front.
   */
  protected async moveSheetById(sheetId: number, index: number) {
    const move = {
      updateSheetProperties: {
        properties: { sheetId, index },
        fields: 'index',
      },
    }
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [move] },
    })
  }

  /**
   * In the sheet titled `title`, find the column with header
   * `matchHeader` and set its formatting to DD-MM-YYYY
   */
  async setDateColumnById(sheetId: number, column: number) {
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
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
                  numberFormat: { type: 'DATE', pattern: 'dd-mm-yyyy' },
                },
              },
              fields: 'userEnteredFormat.numberFormat',
            },
          },
        ],
      },
    })
  }
}

export class Spreadsheet extends SpreadsheetById {
  /**
   * Initialize a new Sheets instance
   */
  protected constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  /**
   * Authenticate with Google Sheets API and initialize `Spreadsheet`
   */
  public static async init(spreadsheetId?: string): Promise<Spreadsheet> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new Spreadsheet(core, id))
  }

  /**
   * Gets a raw sheet.
   */
  protected getSheetRaw(title: string, range?: string) {
    return this.core.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: range ? `${title}!${range}` : title,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
  }

  /**
   * Obtains the sheet ID of a sheet by its title.
   */
  protected async getSheetId(
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
  protected async addSheet(
    title: string,
    rowCount: number,
    columnCount: number,
    developerMetadata?: Record<string, string>
  ): Promise<number> {
    const properties = { title, gridProperties: { rowCount, columnCount } }
    const create = this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties } }],
        includeSpreadsheetInResponse: true,
      },
    })
    const getId = create.then(
      (response): Promise<number> =>
        new Promise((resolve, reject) => {
          const spreadsheet = response.data.updatedSpreadsheet
          if (!spreadsheet)
            return reject('Spreadsheet not updated. No sheet created.')
          if (!spreadsheet.sheets) return reject('No sheets found or created.')
          const sheetId = this.getSheetId(title, spreadsheet.sheets)
          if (!sheetId) return reject(`Sheet ${title} has no ID.`)
          return resolve(sheetId)
        })
    )
    if (!developerMetadata) return getId

    return getId.then((sheetId) =>
      this.core.spreadsheets
        .batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              ...Object.entries(developerMetadata).map(
                ([key, value]): sheets_v4.Schema$Request => ({
                  createDeveloperMetadata: {
                    developerMetadata: {
                      metadataKey: key,
                      metadataValue: value,
                      visibility: 'PROJECT',
                      location: { sheetId },
                    },
                  },
                })
              ),
            ],
          },
        })
        .then(() => sheetId)
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
        const sheet = raw.data.values || []
        const headers = sheet[0].map((v) => camelCaseify(`${v}`))
        return data.map((row) => headers.map((key) => row[key]))
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
}
