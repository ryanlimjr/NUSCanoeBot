import { Spreadsheet, Attendance, TeamData } from './spreadsheet'
import { Date2 } from './date'
import { MasterAttendance } from './spreadsheet/master-attendance'

export { MasterAttendance, Attendance, TeamData, Spreadsheet, Date2 }

const TEST_IDS = {
  main: '1G1Jh4Yuxw9HDXz4CiNwU-8ekq-L8h4kWZt_SKg7Q9YM',
  backend: '1_DaCSoXgTDFIaitcRtBgmYcVFvJcXtbeRrM_NTy2ZHY',
}

export async function bin() {
  console.log('START')
  // initialize spreadsheet handlers
  const teamData = await TeamData.init(TEST_IDS.main)
  await teamData.resetSpreadsheet()
  await teamData.createDatabase()
  await teamData.appendTeamData([
    {
      nickname: 'khang',
      fullName: 'Nguyen Vu Khang',
      birthday: Date2.from(2000, 6, 15).toExcelSerialNumber(),
      shirtSize: 'M',
    },
    {
      nickname: 'toml',
      fullName: 'Tom Liebscher',
      birthday: Date2.from(1993, 8, 3).toExcelSerialNumber(),
      shirtSize: 'L',
    },
  ])

  const att = await teamData.getTeamData()
  console.log(att)
  console.log('DONE')
}
