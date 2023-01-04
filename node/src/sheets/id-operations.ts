import type { sheets_v4 } from '@googleapis/sheets'

/**
 * Relatively low-level sheet operations that rely on having the ID
 */
export class SheetsById {
  protected core: sheets_v4.Sheets
  protected spreadsheetId: string

  /**
   * Initialize a new Sheets instance
   */
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
    this.core = core
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
