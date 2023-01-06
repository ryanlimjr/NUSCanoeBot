/**
 * Get a range of values from `start` (inclusive) to `end` (exclusive)
 */
export function range(start: number, end: number): number[] {
  if (end <= start) return []
  return Array.apply(null, Array(end - start)).map((_, i) => start + i)
}

/**
 * Throws an error if the `array` does not contain `element`
 */
export function assertHas(array: any[], element: any) {
  if (!array.includes(element)) {
    throw new Error(`Array ${array} must contain ${element}`)
  }
}

/**
 * Returns a 2D array filled with `elem`
 */
export function grid<T>(elem: T, height: number, width: number) {
  return Array.apply(null, Array(height)).map(() => Array(width).fill(elem))
}
