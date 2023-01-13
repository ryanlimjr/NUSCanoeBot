import { auth, sheets, sheets_v4 } from '@googleapis/sheets'
import { join } from 'path'
import { camelCaseify } from '../string'

export const CREDENTIALS_PATH = join(process.cwd(), 'google-credentials.json')
export const SERVICE_EMAIL =
  'nus-canoe-service-account@nus-canoe.iam.gserviceaccount.com'
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
export class Spreadsheet {
  protected core: sheets_v4.Sheets
  protected spreadsheetId: string
  protected serviceEmail = SERVICE_EMAIL

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
      .then((s) => s.data.namedRanges || [])
  }

  /**
   * Operations done by id.
   */
  protected byId = {
    /**
     * Deletes one sheet but its id. Also delete related named ranges so
     * none are left hanging
     */
    deleteSheet: async (sheetId: number) => {
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
              ...namedRangeIds.map((id) => ({
                deleteNamedRange: { namedRangeId: id },
              })),
              { deleteSheet: { sheetId } },
            ],
          },
        })
      )
    },
  }

  /**
   * Authenticate with Google Sheets API and initialize `Spreadsheet`
   */
  public static async _init(spreadsheetId?: string): Promise<Spreadsheet> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new Spreadsheet(core, id))
  }

  /**
   * Gets a raw sheet.
   */
  protected getSheet(title: string, range?: string) {
    return this.core.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: range ? `${title}!${range}` : title,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
  }

  /**
   * Creates a sheet called `.anchor` and deletes every other sheet.
   */
  async resetSpreadsheet() {
    await this.deleteSheet('.anchor').catch(() => {})
    return this.addSheet('.anchor', 1, 1)
      .then((anchorId) =>
        this.listSheets().then((sheets) => ({ sheets, anchorId }))
      )
      .then(({ sheets, anchorId }) => {
        const sheetIds: number[] = []
        sheets.forEach((s) => {
          const id = s.properties?.sheetId
          if (!id || id === anchorId) return
          sheetIds.push(id)
        })
        return Promise.all(sheetIds.map(this.byId.deleteSheet))
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
    const getId = create.then((response) => {
      const spreadsheet = response.data.updatedSpreadsheet
      if (!spreadsheet)
        throw new Error('Spreadsheet not updated. No sheet created.')
      if (!spreadsheet.sheets) throw new Error('No sheets found or created.')
      const sheetId = this.getSheetId(title, spreadsheet.sheets)
      if (!sheetId) throw new Error(`Sheet ${title} has no ID.`)
      return sheetId
    })
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
   * Retrieves an attendance sheet by developer metadata instead of
   * sheet title.
   */
  async getSheetByMeta(
    key: string,
    value: string
  ): Promise<sheets_v4.Schema$Sheet> {
    return this.core.spreadsheets
      .get({ spreadsheetId: this.spreadsheetId })
      .then(async (spreadsheet) => {
        const sheets = spreadsheet.data.sheets || []
        if (sheets.length === 0) throw new Error('No sheets found')
        const pred = (m: sheets_v4.Schema$DeveloperMetadata) =>
          m.metadataKey === key && m.metadataValue === value
        const sheet = sheets.find((v) => {
          const meta = v.developerMetadata
          return meta ? Boolean(meta.find(pred)) : false
        })
        if (!sheet)
          throw new Error(
            `No sheet found with metadata key-value pair: [${key}, ${value}]`
          )
        return sheet
      })
  }

  /**
   * Deletes a metadata entry by id.
   */
  async deleteMetadataById(id: number) {
    return this.core.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDeveloperMetadata: {
              dataFilter: { developerMetadataLookup: { metadataId: id } },
            },
          },
        ],
      },
    })
  }

  /**
   * Get all developer metadata
   */
  async getSpreadsheetMetadata(p?: { onlyMetadata: boolean }) {
    return this.core.spreadsheets
      .get({ spreadsheetId: this.spreadsheetId })
      .then((ss) => {
        const sheets = ss.data.sheets || []
        if (p?.onlyMetadata) {
          return sheets.map((v) => v.developerMetadata).filter(Boolean)
        }
        return sheets.map((v) => ({
          title: v.properties?.title,
          sheetId: v.properties?.sheetId,
          metadata: v.developerMetadata,
        }))
      })
  }

  /**
   * Appends a row to an existing sheet. This assumes that the sheet
   * has a header row, which it will use as keys to map the data into.
   *
   * Returns number of rows in the sheet
   */
  async appendRows(
    title: string,
    data: Record<string, any>[],
    headers?: string[]
  ) {
    if (!headers) {
      headers = await this.getSheet(title).then((raw) => {
        const sheet = raw.data.values || []
        if (sheet.length === 0) throw new Error(`Sheet ${title} has no headers`)
        return sheet[0]
      })
    }
    if (!headers) throw new Error('Unable to fetch headers')
    const keys = (headers || []).map(camelCaseify)
    const values = data.map((row) => keys.map((key) => row[key]))
    return this.core.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      valueInputOption: 'RAW',
      range: title,
      requestBody: { majorDimension: 'ROWS', values },
    })
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
   * Deletes one sheet by its title.
   */
  async deleteSheet(title: string) {
    return this.getSheetId(title)
      .then((sheetId) => this.byId.deleteSheet(sheetId))
      .catch((err) => console.log(`[DELETE SHEET]: ${err}`))
  }
}
