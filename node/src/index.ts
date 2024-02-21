import { Spreadsheet, Attendance, TeamData } from './spreadsheet'
import { Date2 } from './date'
import { MasterAttendance } from './spreadsheet/master-attendance'

export { MasterAttendance, Attendance, TeamData, Spreadsheet, Date2 }

const log = (...e: any[]) => console.log('[nus-canoe]', ...e)

/**
 * If this code is not wrapped in bin(), it will be called immediately
 * whenever this file is imported.
 */
export async function bin() {
  log('START')
  log('DONE')
}
