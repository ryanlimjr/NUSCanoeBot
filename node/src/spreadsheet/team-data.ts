import { sheets_v4 } from '@googleapis/sheets'
import { Builder } from '../builder'
import { Date2 } from '../date'
import { camelCaseify } from '../string'
import { TeamMember, validate } from '../types'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'

/**
 * Builds on top of the `Spreadsheet` class to form an ergonomic
 * builder for the weekly attendance sheet.
 */
export class TeamData extends Spreadsheet {
  private title: string
  private headers = ['Nickname', 'Full Name', 'Birthday', 'Shirt Size']

  constructor(core: sheets_v4.Sheets, spreadsheetId: string, title: string) {
    super(core, spreadsheetId)
    this.title = title
  }

  /**
   * Authenticate with Google Sheets API and initialize `TeamData`
   */
  public static async init(
    spreadsheetId?: string,
    title = 'Team Data'
  ): Promise<TeamData> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new TeamData(core, id, title))
  }

  /**
   * Initializes the team's data store
   */
  async createDatabase() {
    const metadata = { type: 'teamData' }
    return this.addSheet(this.title, 2, this.headers.length, metadata)
      .then((id) =>
        this.core.spreadsheets.values
          .update({
            spreadsheetId: this.spreadsheetId,
            range: this.title,
            valueInputOption: 'RAW',
            requestBody: { values: [this.headers] },
          })
          .then(() => id)
      )
      .then((id) => {
        const builder = new Builder(id)
        builder.moveToIndex(1)
        builder.setDateColumn(2, 'dd/mm/yyyy')
        return builder.execute(this.core, this.spreadsheetId)
      })
  }

  /**
   * Sanitizes the team's data store.
   */
  async sanitize() {
    const getSheet = this.getSheet(this.title)
    const getId = this.getSheetId(this.title)
    return Promise.all([getSheet, getId]).then(async ([sheet, sheetId]) => {
      const values = sheet.data.values || []
      const headers = values[0].map((v) => `${v}`.toLowerCase())
      if (!headers) throw new Error('Team Data sheet has no headers.')
      const builder = new Builder(sheetId)
      builder.setDateColumn(headers.indexOf('birthday'))
      return builder.execute(this.core, this.spreadsheetId)
    })
  }

  /**
   * Fetches team data and returns a list of `TeamMember` entries.
   */
  async getTeamData(): Promise<TeamMember[]> {
    return this.getSheet(this.title).then((res) => {
      const result: TeamMember[] = []
      if (!res.data.values) return result
      const firstRow = res.data.values.shift()
      if (!firstRow) return result
      const keys = firstRow.map(camelCaseify)

      res.data.values.forEach((row) => {
        const member = {} as Record<string, any>
        keys.forEach((key, idx) => {
          // parse birthdays differently
          if (key === 'birthday' && row[idx]) {
            member[key] = Date2.fromExcelSerialNumber(row[idx]).toDDMMYYYY()
            return
          }
          member[key] = row[idx]
        })
        result.push(validate.teamMember(member))
      })
      return result
    })
  }

  /**
   * Write member data to Team Data
   */
  async appendTeamData(data: TeamMember[]) {
    return this.appendRows(this.title, data, this.headers)
  }
}
