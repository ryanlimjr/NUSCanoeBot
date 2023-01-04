import { Sheets } from './sheets'

export async function archive(sheets: Sheets) {
  const nicknameSheet = await sheets.getSheet('Nicknames')
  const nicknames = nicknameSheet.toRecord().map((v) => v['nickname'])
  console.log(nicknames)
}

async function main() {
  console.log("START")
  const sheets = await Sheets.init()
  const attendanceSheet = await sheets.getSheet('Jan 02/01 - Jan 08/01')
  const trainings = attendanceSheet.getTrainingCoordinates()
  console.log(trainings)
  console.log(attendanceSheet.rows, attendanceSheet.cols)
  await sheets.addSheetToFront("FRESHIE", 10, 10)
  sheets.addSheetToFront
}

main()
