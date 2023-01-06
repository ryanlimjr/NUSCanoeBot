import { test } from '@jest/globals'
import { Attendance, TeamData, Date2 } from '../src'
import { grid } from '../src/array'

const TEST_IDS = {
  main: '1G1Jh4Yuxw9HDXz4CiNwU-8ekq-L8h4kWZt_SKg7Q9YM',
  backend: '1_DaCSoXgTDFIaitcRtBgmYcVFvJcXtbeRrM_NTy2ZHY',
}

test('create weekly attendance', async () => {
  // initialize spreadsheet handlers
  const teamData = TeamData.init().then((s) => s.getTeamData())
  const att = await teamData.then((t) => Attendance.init(t, TEST_IDS.main))

  await att.resetSpreadsheet()
  const template = grid(null, 11, 21)
  template[0][0] = 'top_left'
  template[8][0] = 'bot_left'
  template[0][20] = 'top_right'
  template[8][20] = 'bot_right'

  await att.createTemplate(template)

  await att.createWeek(Date2.from(2023, 1, 2))

  await att.__mockData__(Date2.from(2023, 1, 2), [
    ['khang', null, 'Quattro ML'],
    ['HL', null, 'Cinco M'],
    ['Syaz', null, 'L8'],
    ['rouvin', null, 'L5'],
  ])
  await att.__mockData__(Date2.from(2023, 1, 3), [
    ['simon', null, 'Sete ML'],
    ['HL', '20km', 'Cinco M'],
    ['cel', null, 'Sete M'],
    ['Haziq', null, 'Sete M'],
    ['shuqi', null, 'Sete M'],
  ])

  // .then((meta) => {
  //   console.log(meta.map((v) => v.metadata))
  // })
})
