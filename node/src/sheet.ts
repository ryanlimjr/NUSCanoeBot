import { Training, CellRange } from './types'
import { range } from './array'
import { camelCaseify, isTrainingDay, parseTrainingDay } from './string'

/**
 * Get number of rows and columns in a ROW major sheet
 */
function getDimensions(sheet: any[][]): { rows: number; cols: number } {
  return {
    rows: sheet.length,
    cols: Math.max(...sheet.map((row) => row.length)),
  }
}

/**
 * Operations on a 2D array.
 */
export class Sheet {
  /**
   * The sheet iteself. The representation must be of ROW major
   * variant, meaning data[0] is the first row, and data[0][0] is the
   * first cell.
   */
  data: any[][]
  rows: number
  cols: number

  constructor(data: any[][]) {
    this.data = data
    const dimensions = getDimensions(this.data)
    this.rows = dimensions.rows
    this.cols = dimensions.cols
  }

  /**
   * Takes in a sheet in ROW major setting. This means that `sheets[0]`
   * refers to the first row, and `sheets[0][0]` refers to the cell A1.
   *
   * This function assumes that the first row is the header row, and
   * that its values are space-separated.
   */
  toRecord(): Record<string, string>[] {
    const firstRow: string[] = this.data[0]
    if (firstRow == undefined) return []
    else if (firstRow.some((v) => typeof v !== 'string')) {
      throw new Error('Header contains non-string elements.')
    }
    const header = firstRow.map(camelCaseify)
    return this.data
      .slice(1)
      .map((line) =>
        line.reduce(
          (a, value, col) => ((a[header[col]] = value), a),
          {} as Record<string, string>
        )
      )
  }

  /**
   * Checks if a cell marks the start of one Training's attendance.
   *
   * Returns true if current cell is a Training (e.g. `Monday (AM)`)
   * and cell below is a serial number (that represents a date)
   *
   *  ┌──────────────────────────┐
   *  │Monday (AM)               │ ← [row, col] points to this cell
   *  ├──────────────────────────┤
   *  │2/1/2023                  │
   *  ├───────┬──────────┬───────┤
   *  │Name   │Remarks   │Boat   │
   *  ├───────┼──────────┼───────┤
   *  │Syaz   │          │L8     │
   *  └───────┴──────────┴───────┘
   */
  private isTrainingRangeStart(row: number, col: number): boolean {
    const cell = this.data[row][col]
    const cellBelow = this.data[row + 1][col]
    return isTrainingDay(cell) && typeof cellBelow === 'number'
  }

  /**
   * Creates a mask over the current data sheet, filled with `element`
   */
  createMask<T>(element: T): T[][] {
    const row: T[] = Array(this.cols).fill(element)
    return Array.apply(null, Array(this.rows)).map(() => [...row])
  }

  getTrainingCoordinates(): [Training, CellRange][] {
    const trainings: [Training, CellRange][] = []
    const taken = this.createMask(false)
    for (let y = 0; y < this.rows - 1; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.isTrainingRangeStart(y, x)) {
          const date = this.data[y + 1][x] // date is one cell below
          const [day, time] = parseTrainingDay(this.data[y][x])
          const training = { date, day, timeOfDay: time }
          trainings.push([training, { x1: x, x2: x + 2, y1: y, y2: y }])
          range(x, x + 3).forEach((x) => (taken[y][x] = true))
        }
      }
    }

    // expand each training's data capture until it reaches another
    // training or it reaches the end of the sheet.
    trainings.forEach(([_, r]) => {
      while (
        // row is within range
        ++r.y2 < this.rows &&
        // next row is entirely not taken
        range(r.x1, r.x2 + 1).every((x) => !taken[r.y2][x])
      ) {
        // set that row as taken
        range(r.x1, r.x2 + 1).forEach((x) => (taken[r.y2][x] = true))
      }
    })

    return trainings
  }
}
