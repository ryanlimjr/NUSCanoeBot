import { CellRange } from '../types'
import { range } from '../array'
import { camelCaseify } from '../string'

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
  protected data: any[][]
  protected rows: number
  protected cols: number

  constructor(data: any[][]) {
    this.data = data
    const dimensions = getDimensions(this.data)
    this.rows = dimensions.rows
    this.cols = dimensions.cols
  }

  /**
   * This function assumes that the first row is the header row, and
   * that its values are space-separated.
   */
  protected toRecord(): Record<string, string>[] {
    const headers = this.getHeaders()
    return this.data
      .slice(1)
      .map((line) =>
        line.reduce(
          (a, value, col) => ((a[headers[col]] = value), a),
          {} as Record<string, string>
        )
      )
  }

  /**
   * Creates a mask over the current data sheet, filled with `element`
   */
  protected createMask<T>(element: T): T[][] {
    const row: T[] = Array(this.cols).fill(element)
    return Array.apply(null, Array(this.rows)).map(() => [...row])
  }

  /**
   * Iterator over rows from `y1` (inclusive) to `y2` (exclusive), and
   * cells from column `x1` (inclusive) to `x2` (exclusive).
   */
  protected slice(r: CellRange) {
    return range(r.y1, r.y2).map((y) => this.data[y].slice(r.x1, r.x2))
  }

  /**
   * Iterator over rows from `y1` (inclusive) to `y2` (exclusive), and
   * cells from column `x1` (inclusive) to `x2` (exclusive).
   */
  protected iter(r: CellRange) {
    return range(r.y1, r.y2).flatMap((y) =>
      range(r.x1, r.x2).map((x) => [x, y])
    )
  }

  /**
   * Use the first row as a header row, and camelCaseify every entry
   * as a form of normalization.
   */
  getHeaders(): string[] {
    const firstRow: string[] = this.data[0]
    if (firstRow == undefined) return []
    if (firstRow.some((v) => typeof v !== 'string')) {
      throw new Error('Header contains non-string elements.')
    }
    return firstRow.map(camelCaseify)
  }
}
