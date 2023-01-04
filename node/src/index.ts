import { Sheets } from './sheets'

export async function initializeUserDatabase(sheets: Sheets) {
  const sheetTitle = 'user-database'
  const headers = ['Nickname', 'Full Name', 'Birthday']
  await sheets.deleteSheet(sheetTitle)
  await sheets.addSheetToFront(sheetTitle, 1, headers.length)
  await sheets.setHeader(sheetTitle, headers)
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
  await sheets.setHeader(sheetTitle, headers)
}

export async function getNicknames(
  sheets: Sheets
): Promise<Record<string, string>> {
  return sheets.getSheet('Nicknames').then((sheet) => {
    const nicknames = {} as Record<string, string>
    sheet.toRecord().forEach((v) => (nicknames[v['nickname']] = v['fullName']))
    return nicknames
  })
}

async function main() {
  console.log('START')
  const sheets = await Sheets.init()
  await initializeTrainingDatabase(sheets)
  const nicknames = await getNicknames(sheets)
  const attendanceSheet = await sheets.getSheet('Dec 26/12 - Jan 01/01')
  const attendanceData = attendanceSheet.getTrainingAttendance(nicknames)
  await sheets.appendRows('training-database', attendanceData)
  await sheets.setDateColumn('training-database', 0)
  console.log('DONE')
}

main()
