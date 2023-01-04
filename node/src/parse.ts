import { camelCaseify } from './string'
import { assertHas } from './array'

export function parseTrainingHeader(cells: any[]): string[] {
  assertHas(cells, 'Name')
  assertHas(cells, 'Remarks')
  assertHas(cells, 'Boat')
  return cells.map((v) => camelCaseify(`${v}`))
}
