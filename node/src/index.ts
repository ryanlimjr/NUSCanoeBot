import { Sheets } from './sheets'

export async function archive(sheets: Sheets) {
  const nicknameSheet = await sheets.getSheet('Nicknames')
  const nicknames = nicknameSheet.toRecord().map((v) => v['nickname'])
  console.log(nicknames)
  const attendanceSheet = await sheets.getSheet('Jan 02/01 - Jan 08/01')
  const trainings = attendanceSheet.getTrainingCoordinates()
  console.log(trainings)
  console.log(attendanceSheet.rows, attendanceSheet.cols)
}

export async function initializeMasterDatabase(sheets: Sheets) {
  const sheetTitle = 'master-database'
  const headers = ['Nickname', 'Full Name', 'Birthday']
  await sheets.deleteSheet(sheetTitle)
  await sheets.addSheetToFront(sheetTitle, 1, headers.length)
  await sheets.setHeader(sheetTitle, headers)
  await sheets.appendRow(sheetTitle, {
    nickname: 'khang',
    fullName: 'Nguyen Vu Khang',
  })
}

async function main() {
  console.log('START')
  const sheets = await Sheets.init()
  initializeMasterDatabase(sheets)
}

main()
