import type { sheets_v4 } from '@googleapis/sheets'
import { Date2 } from '../../date'
import { namedRange } from '../../string'
import { CellRange, Session, TeamMember, toGridRange } from '../../types'

export type TrainingRange = {
  date: Date2
  session: Session
  range: CellRange
}

/**
 * A helper class to build a weekly attendance list.
 */
export class Builder {
  requests: sheets_v4.Schema$Request[]
  sheetId: number

  constructor(sheetId: number) {
    this.sheetId = sheetId
    this.requests = []
  }

  private toGridRange(range: CellRange, sheetId = this.sheetId) {
    return toGridRange(range, sheetId)
  }

  /**
   * Lock the last column of the sheet and hides it.
   */
  lockColumn(email: string, width: number) {
    this.requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: this.sheetId,
          dimension: 'COLUMNS',
          startIndex: width,
          endIndex: width + 1,
        },
        properties: { pixelSize: 1, hiddenByUser: true },
        fields: 'pixelSize,hiddenByUser',
      },
    })
    this.requests.push({
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId: this.sheetId,
            startColumnIndex: width,
            endColumnIndex: width + 1,
          },
          editors: { users: [email] },
        },
      },
    })
  }

  /**
   * Locks the specified rows.
   */
  lockRows(email: string, trainingRows: number[], rowHeight = 1) {
    trainingRows
      .map((row) => ({
        sheetId: this.sheetId,
        startRowIndex: row,
        endRowIndex: row + rowHeight,
      }))
      .forEach((range) => {
        this.requests.push({
          addProtectedRange: {
            protectedRange: { range, editors: { users: [email] } },
          },
        })
      })
  }

  /**
   * Merge the range, bold it and center the text.
   */
  mergeBoldCenter(range: CellRange) {
    this.requests.push({ mergeCells: { range: this.toGridRange(range) } })
    this.requests.push({
      repeatCell: {
        range: this.toGridRange(range),
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
      },
    })
  }

  /**
   * Bold all text in the range.
   */
  bold(range: CellRange) {
    this.requests.push({
      repeatCell: {
        range: this.toGridRange(range),
        cell: { userEnteredFormat: { textFormat: { bold: true } } },
        fields: 'userEnteredFormat.textFormat',
      },
    })
  }

  /**
   * Name the range.
   */
  name(trainingRange: TrainingRange) {
    const { range, session, date } = trainingRange
    this.requests.push({
      addNamedRange: {
        namedRange: {
          name: namedRange(date, session),
          range: this.toGridRange(range),
        },
      },
    })
  }

  /**
   * Colorize the training range.
   */
  color(trainingRange: TrainingRange) {
    const { range, date } = trainingRange
    this.requests.push({
      repeatCell: {
        range: this.toGridRange(range),
        cell: {
          userEnteredFormat: {
            // color Tuesdays, Thursdays, and Saturdays differently
            backgroundColor: [2, 4, 6].includes(date.day())
              ? { red: 0.64, green: 0.76, blue: 0.96 }
              : { red: 0.95, green: 0.76, blue: 0.2 },
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  }

  /**
   * Copy the `range` of cells from the template sheet.
   */
  loadTemplate(templateSheetId: number, range: CellRange) {
    this.requests.push({
      copyPaste: {
        source: this.toGridRange(range, templateSheetId),
        destination: this.toGridRange(range),
        pasteType: 'PASTE_NORMAL',
        pasteOrientation: 'NORMAL',
      },
    })
  }

  /**
   * Criss-cross the range with borders.
   */
  allBorder(trainingRange: TrainingRange) {
    const range = { ...trainingRange.range, y1: trainingRange.range.y1 - 3 }
    const gray = 0.3
    const borderStyle = {
      style: 'SOLID',
      colorStyle: { rgbColor: { red: gray, green: gray, blue: gray } },
    }
    this.requests.push({
      updateBorders: {
        range: this.toGridRange(range),
        top: borderStyle,
        bottom: borderStyle,
        right: borderStyle,
        left: borderStyle,
        innerHorizontal: borderStyle,
        innerVertical: borderStyle,
      },
    })
  }

  /**
   * Add a nickname validator to the training range.
   */
  validateNicknames(trainingRange: TrainingRange, team: TeamMember[]) {
    const range = { ...trainingRange.range, x2: trainingRange.range.x1 + 1 }
    this.requests.push({
      setDataValidation: {
        range: this.toGridRange(range),
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: team.map((m) => ({
              userEnteredValue: m.nickname,
            })),
          },
          strict: true,
          showCustomUi: true,
        },
      },
    })
  }

  /**
   * Delete all named ranges. Note that if a named range exists but
   * is an invalid reference (points to a deleted sheet), then that
   * named range will not be deleted. This is a limitation of Google
   * Sheets API.
   */
  async deleteNamedRange(namedRangeId: string) {
    this.requests.push({ deleteNamedRange: { namedRangeId } })
  }

  /**
   * Delete rows from startIndex (inclusive) to endIndex (exclusive)
   * deleteRows(1, 4) will delete the visual rows 2, 3, and 4. (Google
   * Sheets' GUI is 1-indexed)
   */
  async deleteRows(startIndex: number, endIndex: number) {
    if (startIndex >= endIndex) return
    this.requests.push({
      deleteDimension: {
        range: {
          sheetId: this.sheetId,
          dimension: 'ROWS',
          startIndex,
          endIndex,
        },
      },
    })
  }

  /**
   * Build it and ship it.
   */
  async build(core: sheets_v4.Sheets, spreadsheetId: string) {
    return core.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: this.requests },
    })
  }
}
