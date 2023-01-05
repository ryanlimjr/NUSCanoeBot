import { Spreadsheet, Attendance, TeamData } from './spreadsheet'
import { attendanceSheetTitle } from './string'
import { Date2 } from './date'
import { MasterAttendance } from './spreadsheet/master-attendance'

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

  // initialize master attendance sheet
  const masterAtt = await MasterAttendance.init()
  // masterAtt.create().catch(errMsg)

  const dates = [
    Date2.from(2023, 1, 2),
    Date2.from(2023, 1, 9),
    Date2.from(2023, 1, 16),
  ]

  // create attendance (currently hard-coded with some real life data)
  const attendance = await Attendance.init()

  await attendance.deleteSheet(attendanceSheetTitle(dates[0]))
  await attendance.createWeek(dates[0], teamData).catch(errMsg)
  // await attendance.createWeek(dates[1]).catch(errMsg)
  // await attendance.createWeek(dates[2]).catch(errMsg)

  // for (let i = 0; i < dates.length; i++) {
  //   const date = dates[i]
  //   await attendance
  //     .getAttendance(date, teamData)
  //     .then(([att]) => masterAtt.updateAttendance(date, att))
  // }

  console.log('DONE')
}

main()
