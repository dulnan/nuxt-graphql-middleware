import { describe, expect, test } from 'vitest'
import { falsy, buildRequestParams } from './../../../src/runtime/helpers/index'

describe('falsy', () => {
  test('should filter out null and undefined items in an array', () => {
    expect(
      ['one', null, 'two', undefined, 'three', false, 'four'].filter(falsy),
    ).toEqual(['one', 'two', 'three', false, 'four'])
  })
})

describe('buildRequestParams', () => {
  test('returns empty object for falsy argument', () => {
    expect(buildRequestParams()).toEqual({})
  })

  test('returns same object if all properties are strings', () => {
    expect(
      buildRequestParams({
        one: 'one',
        two: 'two',
      }),
    ).toEqual({
      one: 'one',
      two: 'two',
    })
  })

  test('returns object as stringified JSON if one property is not a string', () => {
    expect(
      buildRequestParams({
        one: 'one',
        two: 'two',
        three: 3,
      }),
    ).toEqual({
      __variables: `{"one":"one","two":"two","three":3}`,
    })

    expect(
      buildRequestParams({
        foobar: {
          one: 'one',
        },
      }),
    ).toEqual({
      __variables: `{"foobar":{"one":"one"}}`,
    })
  })
})
