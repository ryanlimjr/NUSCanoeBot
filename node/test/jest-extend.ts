import { expect } from '@jest/globals'
import type { sheets_v4 } from '@googleapis/sheets'
import type { MatcherFunction } from 'expect'

const toIncludeSameMembers: MatcherFunction<[expected: unknown[]]> = function (
  received,
  expected
) {
  const pass =
    this.equals(received, expect.arrayContaining(expected)) &&
    this.equals(expected, expect.arrayContaining(received as unknown[]))
  const r = this.utils.printReceived(received)
  const e = this.utils.printExpected(expected)
  return {
    message: () =>
      pass
        ? `expected ${r} not to be include same members as ${e}.`
        : `expected ${r} to be include same members as ${e}.`,
    pass,
  }
}

const toHaveMetadata: MatcherFunction<[key: string, value: string]> = function (
  received,
  key,
  value
) {
  const r = this.utils.printReceived(received)
  const k = this.utils.printExpected(key)
  const v = this.utils.printExpected(value)

  const pass = this.equals(
    received,
    expect.arrayContaining([
      expect.arrayContaining([
        expect.objectContaining({ metadataKey: key, metadataValue: value }),
      ]),
    ])
  )
  return {
    message: () =>
      pass
        ? `expected ${r} not to include { ${k}: ${v} }`
        : `expected ${r} to include { ${k}: ${v} }`,
    pass,
  }
}

expect.extend({
  toIncludeSameMembers,
  toHaveMetadata,
})

declare module 'expect' {
  interface AsymmetricMatchers {
    toIncludeSameMembers<T>(expected: T[]): void
  }
  interface Matchers<R> {
    toIncludeSameMembers<T>(expected: T[]): R
    toHaveMetadata(key: string, value: string): R
  }
}
