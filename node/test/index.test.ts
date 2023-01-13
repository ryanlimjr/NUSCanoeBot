import { expect, test } from '@jest/globals'
import { Attendance, TeamData, Date2 } from '../src'
import { grid } from '../src/array'
import './jest-extend'

const TEST_IDS = {
  main: '1G1Jh4Yuxw9HDXz4CiNwU-8ekq-L8h4kWZt_SKg7Q9YM',
  backend: '1_DaCSoXgTDFIaitcRtBgmYcVFvJcXtbeRrM_NTy2ZHY',
}

test.only('end-to-end test', async () => {
  /**
   * Initialize team database. This is where members key in their
   * nickname, full name, and other personal particulars
   *
   * Since the attendance list require nicknames to validate entry
   * correctness, this has to be set up first.
   */
  const ss = await TeamData.init(TEST_IDS.main)
  await ss.resetSpreadsheet() //clear old runs

  await ss.createDatabase()
  await ss.appendTeamData([
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

  /**
   * Assert that the new sheet was created with correct metadata
   */
  expect(ss.getSpreadsheetMetadata()).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        title: 'Team Data',
        metadata: expect.arrayContaining([
          expect.objectContaining({
            metadataKey: 'type',
            metadataValue: 'teamData',
          }),
        ]),
      }),
    ])
  )

  /**
   * Assert that the team database returns data back correctly
   */
  const teamData = await ss.getTeamData()
  expect(teamData).toIncludeSameMembers([
    {
      nickname: 'khang',
      fullName: 'Nguyen Vu Khang',
      birthday: '15/6/2000',
      shirtSize: 'M',
    },
    {
      nickname: 'toml',
      fullName: 'Tom Liebscher',
      birthday: '3/8/1993',
      shirtSize: 'L',
    },
  ])

  /** initialize a handler to attendance sheets */
  const att = await Attendance.init(teamData, TEST_IDS.main)
  const template = grid(null, 11, 21)
  template[0][0] = 'top_left'
  template[8][0] = 'bot_left'
  template[0][20] = 'top_right'
  template[8][20] = 'bot_right'

  await att.createTemplate(template)

  await att.createWeek(Date2.from(2023, 1, 2))

  const promises: Promise<any>[] = []

  promises.push(
    att.__mockData__(Date2.from(2023, 1, 2), 'AM', [
      ['khang', 'leave 2024', 'Quattro ML'],
    ])
  )
  promises.push(
    att.__mockData__(Date2.from(2023, 1, 3), 'PM', [['toml', null, 'Sete L']])
  )
  await Promise.all(promises)

  const [entries, errors] = await att.getAttendance(Date2.from(2023, 1, 2))
  // let meta = await att
  //   .getSpreadsheetMetadata()
  //   .then((s) => s.map((v) => v.metadata))
  // expect(meta).toHaveMetadata('type', 'attendance')
  // expect(meta).toHaveMetadata('type', 'teamData')

  expect(errors).toHaveLength(0)
  expect(entries).toIncludeSameMembers([
    {
      boat: 'Quattro ML',
      date: Date2.from(2023, 1, 2).toExcelSerialNumber(),
      fullName: 'Nguyen Vu Khang',
      nickname: 'khang',
      remarks: 'leave 2024',
      session: 'AM',
    },
    {
      boat: 'Sete L',
      date: Date2.from(2023, 1, 3).toExcelSerialNumber(),
      fullName: 'Tom Liebscher',
      nickname: 'toml',
      remarks: '',
      session: 'PM',
    },
  ])
})
