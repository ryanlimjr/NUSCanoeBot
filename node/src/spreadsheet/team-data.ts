import { sheets_v4 } from '@googleapis/sheets'
import { Date2 } from '../date'
import { camelCaseify } from '../string'
import { TeamMember, validate } from '../types'
import { Spreadsheet, SPREADSHEET_IDS, initCore } from './base'

/**
 * Builds on top of the `Spreadsheet` class to form an ergonomic
 * builder for the weekly attendance sheet.
 */
export class TeamData extends Spreadsheet {
  constructor(core: sheets_v4.Sheets, spreadsheetId: string) {
    super(core, spreadsheetId)
  }

  /**
   * Authenticate with Google Sheets API and initialize `TeamData`
   */
  public static async init(spreadsheetId?: string): Promise<TeamData> {
    const id = spreadsheetId ? spreadsheetId : SPREADSHEET_IDS.main
    return initCore().then((core) => new TeamData(core, id))
  }

  private title = 'Team Data'

  /**
   * Initializes the team's data store.
   */
  async createDatabase(headers: string[]) {
    await this.deleteSheet(this.title).catch(console.log)
    return (
      this.addSheet(this.title, 2, headers.length, { type: 'team-data' })
        .then((id) => this.moveSheetById(id, 2).then(() => id))
        .then((sheetId) =>
          this.core.spreadsheets.values
            .update({
              spreadsheetId: this.spreadsheetId,
              range: this.title,
              valueInputOption: 'RAW',
              requestBody: { values: [headers] },
            })
            .then(() => sheetId)
        )
        // .then(() =>
        //   this.appendRows(this.title, [
        //     {
        //       fullName: 'Nguyen Vu Khang',
        //       nickname: 'khang',
        //       birthday: Date2.from(2000, 6, 15).toExcelSerialNumber(),
        //       shirtSize: 'M',
        //     },
        //   ])
        // )
        .then((id) => this.setDateColumn(this.title, 2).then(() => id))
    )
  }

  /**
   * Sanitizes the team's data store.
   */
  async sanitize() {
    return this.getSheetRaw(this.title).then((res) => {
      const values = res.data.values || []
      const headers = values[0].map((v) => `${v}`.toLowerCase())

      if (!headers) throw new Error('Team Data sheet has no headers.')
      return this.setDateColumn(this.title, headers.indexOf('birthday'))
    })
  }

  /**
   * Fetches team data and returns a list of `TeamMember` entries.
   */
  async getTeamData(): Promise<TeamMember[]> {
    return this.getSheetRaw(this.title).then((res) => {
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
}
