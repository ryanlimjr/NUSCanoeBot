import { Spreadsheet, Attendance, TeamData } from './spreadsheet'
import { Date2 } from './date'
import { MasterAttendance } from './spreadsheet/master-attendance'
import { attendanceSheetTitle } from './string'

export async function initializeUserDatabase(sheets: Spreadsheet) {
  const sheetTitle = 'user-database'
  const headers = ['Nickname', 'Full Name', 'Birthday']
  await sheets.deleteSheet(sheetTitle)
  await sheets.addSheetToFront(sheetTitle, 1, headers.length)
  await sheets.setHeaders(sheetTitle, headers)
  await sheets.appendRows(sheetTitle, [
    {
      nickname: 'khang',
      fullName: 'Nguyen Vu Khang',
    },
  ])
}

export async function initializeTrainingDatabase(sheets: Spreadsheet) {
  const sheetTitle = 'training-database'
  const headers = [
    'Date',
    'Session',
    'Full Name',
    'Remarks',
    'Boat',
    'Nickname',
  ]
  await sheets.deleteSheet(sheetTitle)
  await sheets.addSheetToFront(sheetTitle, 1, headers.length)
  await sheets.setHeaders(sheetTitle, headers)
}

export const errMsg = (e: any) => console.log(e.message)

async function main() {
  console.log('START')

  // initialize team profile data
  const teamData = await TeamData.init()
    .then((res) => res.getTeamData())
    .catch(() => [])

  // initialize attendance sheet
  const attendance = await Attendance.init(teamData)

  // initialize master attendance sheet
  const masterAtt = await MasterAttendance.init(
    attendance,
    '15asIgRPXHeyz_FY_tq9X7tw5yeXReNTojuItpEmukwA'
  )

  const dates = [
    Date2.from(2023, 1, 2),
    Date2.from(2023, 1, 9),
    Date2.from(2023, 1, 16),
    Date2.from(2023, 1, 23),
  ]

  // await attendance.deleteWeek(dates[3])
  // await attendance.createWeek(dates[3]).catch(errMsg)
  masterAtt.updateAttendance(dates[0]);
  // masterAtt.updateAttendance(dates[3]);

  console.log('DONE')
}

main()
