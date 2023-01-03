import { sheets, auth, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'
import { Sheet } from './sheet'

export const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')
export const SPREADSHEET_IDS = {
  main: '1W_mRwNhylC41bY6Hn5hmeRgUVpAdugsjHEwmoFtd2PM',
}
export const SPREADSHEET_ID = '1W_mRwNhylC41bY6Hn5hmeRgUVpAdugsjHEwmoFtd2PM'

export class Sheets {
  core: sheets_v4.Sheets
  spreadsheetId: string

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
   * Fetch data of one sheet, with an optional range.
   * If no range is provided, then fetch the entire sheet.
   *
   * @param name: the name of one sheet within the entire spreadsheet
   * @param range: the range of cells to take (e.g. `A2:F9`)
   */
  async getSheet(name: string, range?: string): Promise<Sheet> {
    const res = this.core.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: range ? `${name}!${range}` : name,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
    return res.then((res) => new Sheet(res.data.values || []))
  }
}
