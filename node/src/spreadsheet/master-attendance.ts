import { sheets_v4 } from '@googleapis/sheets'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'
import { validate } from '../types'
import { camelCaseify } from '../string'
import { Date2 } from '../date'
import { Attendance } from './attendance'
import { Builder } from '../builder'

/**
 * Builds on top of the `Spreadsheet` class to form an ergonomic
 * builder for the weekly attendance sheet.
 */
export class MasterAttendance extends Spreadsheet {
  private attendanceSpreadsheet: Attendance

  constructor(
    core: sheets_v4.Sheets,
    spreadsheetId: string,
    attendanceSpreadsheet: Attendance
  ) {
    super(core, spreadsheetId)
    this.attendanceSpreadsheet = attendanceSpreadsheet
  }

  /**
   * Authenticate with Google Sheets API and initialize `MasterAttendance`
   */
  public static async init(
    attendanceSpreadsheet: Attendance,
    spreadsheetId?: string
  ): Promise<MasterAttendance> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then(
      (core) => new MasterAttendance(core, id, attendanceSpreadsheet)
    )
  }

  private title = 'Master Attendance'
  private headers = [
    'Date',
    'Session',
    'Full Name',
    'Remarks',
    'Boat',
    'Nickname',
  ]

  /**
   */
  async create() {
    return this.addSheet(this.title, 1, this.headers.length).then(() =>
      this.setHeaders(this.title, this.headers)
    )
  }

  /**
   * Gets the start (inclusive) and end (exclusive) rows that contain
   * trainings from the week starting with `monday`
   */
  async getCurrent(monday: Date2): Promise<[number, number]> {
    return this.getSheet(this.title).then((sheet) => {
      const values = sheet.data.values || []
      if (!values[0]) throw new Error('Master Attendance list has no headers.')
      const headers = values[0].map(camelCaseify)
      if (!values[1]) return [0, 0]

      // left and right bounds of dates to search
      const start = monday.toExcelSerialNumber()
      const end = monday.incrementDay(6).toExcelSerialNumber()

      let [startRow, endRow] = [1, 1]

      for (let i = 1; i < values.length; i++) {
        const row = values[i].map((v) => `${v}`)
        const entry = {} as Record<string, any>
        headers.forEach((key, idx) => (entry[key] = row[idx]))
        const att = validate.attendanceEntry(entry)
        if (att.date < start) {
          startRow += 1
          endRow += 1
        } else if (start <= att.date && att.date <= end) {
          endRow += 1
        } else break
      }
      console.log({ startRow, endRow, length: values.length })
      if (startRow === values.length) return [0, 0]
      return [startRow, endRow]
    })
  }

  /**
   * Cleans up the database without changing its data. Critically, it
   * sorts all entries by date. This is required for quick deletion of
   * data.
   */
  async sanitize() {
    // TODO: use builder here
    // tasks:
    // 1. set date formatting for the 'Date' column
    // 2. sort by nicknames first, and then by date.
    //
    // /** previous code */
    //
    // const dateCol = this.headers.indexOf('Date')
    // return this.setDateColumn(this.title, this.headers.indexOf('Date'))
    //   .then(() => this.getSheetId(this.title))
    //   .then((sheetId) =>
    //     this.batchUpdate({
    //       spreadsheetId: this.spreadsheetId,
    //       requestBody: {
    //         requests: [
    //           {
    //             repeatCell: {
    //               range: {
    //                 sheetId,
    //                 startRowIndex: 0,
    //                 startColumnIndex: dateCol,
    //                 endColumnIndex: dateCol + 1,
    //               },
    //               cell: {
    //                 userEnteredFormat: {
    //                   numberFormat: { type: 'DATE', pattern: 'dd/mm/yyyy' },
    //                 },
    //               },
    //               fields: 'userEnteredFormat.numberFormat',
    //             },
    //           },
    //           {
    //             sortRange: {
    //               range: { sheetId, startRowIndex: 1 },
    //               sortSpecs: [
    //                 {
    //                   sortOrder: 'ASCENDING',
    //                   dimensionIndex: this.headers.indexOf('Date'),
    //                 },
    //                 {
    //                   sortOrder: 'ASCENDING',
    //                   dimensionIndex: this.headers.indexOf('Nickname'),
    //                 },
    //               ],
    //             },
    //           },
    //         ],
    //       },
    //     })
    //   )
  }

  /**
   * Deletes rows containing entries from the week starting with
   * `monday`
   */
  async removeOldEntries(monday: Date2) {
    const rowRange = this.getCurrent(monday)
    const sheetId = this.getSheetId(this.title)
    return Promise.all([rowRange, sheetId]).then(([rowRange, id]) => {
      const [start, end] = rowRange
      const builder = new Builder(id)
      builder.deleteRows(start, end)
      return builder.execute(this.core, this.spreadsheetId)
    })
  }

  /**
   * Update attendance of the week starting with `monday`. All
   * previously existing entries from that week will be deleted.
   */
  async updateAttendance(monday: Date2) {
    const getEntries = this.attendanceSpreadsheet.getAttendance(monday)
    const removeOld = this.removeOldEntries(monday)
    return Promise.all([getEntries, removeOld])
      .then(([[entries, _err]]) => {
        return this.appendRows(this.title, entries)
      })
      .then(() => this.sanitize().catch((e) => console.log(e.message)))
  }
}
