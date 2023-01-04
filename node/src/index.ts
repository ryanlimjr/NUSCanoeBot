import { TeamDataSheet, AttendanceSheet } from './sheet'
import { Sheets } from './sheets'

export async function initializeUserDatabase(sheets: Sheets) {
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

export async function initializeTrainingDatabase(sheets: Sheets) {
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

export async function demo(sheets: Sheets) {
  console.log('start demo...')
  await initializeTrainingDatabase(sheets)
  const teamData = await sheets.getSheet('Team Data', TeamDataSheet)
  const nicknames = teamData.getNicknames()
  const attendanceSheet = await sheets.getSheet(
    'Dec 26/12 - Jan 01/01',
    AttendanceSheet
  )
  const attendanceData = attendanceSheet.getAttendance(nicknames)
  await sheets.appendRows('training-database', attendanceData)
  await sheets.setDateColumn('training-database', 0)
  console.log('demo done!')
}

async function main() {
  console.log('START')
  const sheets = await Sheets.init()
  await sheets
    .deleteSheet('__weekly__')
    .then(() => sheets.__createAttendance__('__weekly__'))
    .then(() => sheets.moveToFront('__weekly__'))
  console.log('DONE')
}

main()
