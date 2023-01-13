/**
 * Get a range of values from `start` (inclusive) to `end` (exclusive)
 */
export function range(start: number, end: number): number[] {
  if (end <= start) return []
  return Array.apply(null, Array(end - start)).map((_, i) => start + i)
}

/**
 * Returns a 2D array filled with `elem`
 */
export function grid<T>(elem: T, height: number, width: number) {
  return Array.apply(null, Array(height)).map(() => Array(width).fill(elem))
}
