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

export async function buildAttendance(sheets: Attendance) {
  await sheets.clearNamedRanges()
  const date = Date2.from(2023, 1, 8)
  const title = attendanceSheetTitle(date)
  const deleteSheet = sheets.deleteSheet(title)
  const create = deleteSheet.then(() => sheets.createWeek(date))
  const move = create.then((title) => sheets.moveToFront(title))
  await move.catch((e) => console.log('MAIN LOOP', e))
  await sheets.listSheets().then((sheets) => {
    const a = sheets.find((s) => s.properties?.title === title)
    if (!a) return
    console.log(a.developerMetadata)
  })
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

  // create attendance (currently hard-coded with some real life data)
  const attendance = await Attendance.init()
  await attendance.createWeek(Date2.from(2023, 1, 15)).catch(errMsg)
  await attendance.createWeek(Date2.from(2023, 1, 8)).catch(errMsg)

  const dates = [Date2.from(2023, 1, 8), Date2.from(2023, 1, 15)]

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    await attendance
      .getAttendance(date, teamData)
      .then(([att]) => masterAtt.updateAttendance(date, att))
  }

  // await Promise.allSettled(promises)
  console.log('DONE')
}

main()
