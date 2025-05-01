import { describe, expect, test } from 'vitest'
import { falsy } from './../../../src/runtime/helpers/index'

describe('falsy', () => {
  test('should filter out null and undefined items in an array', () => {
    expect(
      ['one', null, 'two', undefined, 'three', false, 'four'].filter(falsy),
    ).toEqual(['one', 'two', 'three', false, 'four'])
  })
})
