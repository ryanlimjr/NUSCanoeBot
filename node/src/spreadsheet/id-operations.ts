import { auth, sheets, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'

const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')

/**
 * Relatively low-level sheet operations that rely on having the ID
 */
export class SpreadsheetById {
  protected core: sheets_v4.Sheets
  protected spreadsheetId: string
  protected static CREDENTIALS_PATH = join(
    process.cwd(),
    'google-credentials.json'
  )
  protected static SPREADSHEET_IDS = {
    main: '1W_mRwNhylC41bY6Hn5hmeRgUVpAdugsjHEwmoFtd2PM',
  }

  /**
   * Initialize a new Sheets instance
   */
  protected constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
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
  protected static async initCore(keyFile?: string): Promise<sheets_v4.Sheets> {
    // fill in default values
    keyFile = keyFile ? keyFile : CREDENTIALS_PATH
    // authenticate and get client
    const scopes = ['https://www.googleapis.com/auth/spreadsheets']
    return auth
      .getClient({ keyFile, scopes })
      .then((auth) => sheets({ version: 'v4', auth }))
  }

  /**
   * Deletes one sheet but its id.
   */
  protected async deleteSheetById(sheetId: number) {
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [{ deleteSheet: { sheetId } }] },
    })
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
    })
  }
}
