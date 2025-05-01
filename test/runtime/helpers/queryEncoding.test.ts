import { vi, describe, expect, test, beforeEach } from 'vitest'
import {
  encodeVariables,
  decodeVariables,
} from './../../../src/runtime/helpers/queryEncoding'
import * as config from '#nuxt-graphql-middleware/config'

// Mock the config module
vi.mock('#nuxt-graphql-middleware/config', () => {
  return {
    experimentalQueryParamEncoding: false,
  }
})

describe('encodeVariables (legacy mode)', () => {
  beforeEach(() => {
    // Ensure experimental mode is off for legacy tests
    vi.mocked(config).experimentalQueryParamEncoding = false
  })

  test('returns empty object for falsy argument', () => {
    expect(encodeVariables()).toEqual({})
    expect(encodeVariables(null)).toEqual({})
  })

  test('returns same object if all properties are strings', () => {
    expect(
      encodeVariables({
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
      encodeVariables({
        one: 'one',
        two: 'two',
        three: 3,
      }),
    ).toEqual({
      __variables: `{"one":"one","two":"two","three":3}`,
    })

    expect(
      encodeVariables({
        foobar: {
          one: 'one',
        },
      }),
    ).toEqual({
      __variables: `{"foobar":{"one":"one"}}`,
    })
  })

  test('handles boolean properties by using JSON fallback', () => {
    expect(
      encodeVariables({
        name: 'John',
        isActive: true,
      }),
    ).toEqual({
      __variables: `{"name":"John","isActive":true}`,
    })
  })

  test('handles undefined and null values by using JSON fallback', () => {
    expect(
      encodeVariables({
        name: 'John',
        noValue: null,
        missingValue: undefined,
      }),
    ).toEqual({
      __variables: `{"name":"John","noValue":null}`,
    })
  })
})

describe('encodeVariables (experimental mode)', () => {
  beforeEach(() => {
    // Enable experimental mode for these tests
    vi.mocked(config).experimentalQueryParamEncoding = true
  })

  test('returns empty object for falsy argument', () => {
    expect(encodeVariables()).toEqual({})
    expect(encodeVariables(null)).toEqual({})
  })

  test('preserves string properties without prefix', () => {
    expect(
      encodeVariables({
        name: 'John',
        title: 'Developer',
      }),
    ).toEqual({
      name: 'John',
      title: 'Developer',
    })
  })

  test('prefixes number properties with n:', () => {
    expect(
      encodeVariables({
        name: 'John',
        age: 30,
      }),
    ).toEqual({
      name: 'John',
      'n:age': '30',
    })
  })

  test('prefixes boolean properties with b:', () => {
    expect(
      encodeVariables({
        name: 'John',
        isActive: true,
        isAdmin: false,
      }),
    ).toEqual({
      name: 'John',
      'b:isActive': 'true',
      'b:isAdmin': 'false',
    })
  })

  test('handles mixed primitive types correctly', () => {
    expect(
      encodeVariables({
        name: 'Jon',
        age: 20,
        isUser: false,
      }),
    ).toEqual({
      name: 'Jon',
      'n:age': '20',
      'b:isUser': 'false',
    })
  })

  test('falls back to JSON for objects', () => {
    expect(
      encodeVariables({
        name: 'John',
        profile: { title: 'Developer', level: 'Senior' },
      }),
    ).toEqual({
      __variables: `{"name":"John","profile":{"title":"Developer","level":"Senior"}}`,
    })
  })

  test('falls back to JSON for arrays', () => {
    expect(
      encodeVariables({
        name: 'John',
        skills: ['JavaScript', 'TypeScript', 'Vue'],
      }),
    ).toEqual({
      __variables: `{"name":"John","skills":["JavaScript","TypeScript","Vue"]}`,
    })
  })

  test('falls back to JSON for null and undefined values', () => {
    expect(
      encodeVariables({
        name: 'John',
        noValue: null,
        something: undefined,
      }),
    ).toEqual({
      __variables: `{"name":"John","noValue":null}`,
    })
  })
})

describe('decodeVariables (legacy mode)', () => {
  beforeEach(() => {
    // Ensure experimental mode is off for legacy tests
    vi.mocked(config).experimentalQueryParamEncoding = false
  })

  test('returns same object if __variables is not present', () => {
    const query = { name: 'John', role: 'admin' }
    expect(decodeVariables(query)).toEqual(query)
  })

  test('parses JSON from __variables if present', () => {
    const query = {
      __variables: '{"name":"John","age":30,"isAdmin":true}',
    }
    expect(decodeVariables(query)).toEqual({
      name: 'John',
      age: 30,
      isAdmin: true,
    })
  })

  test('returns original query if __variables JSON parsing fails', () => {
    const query = {
      __variables: '{invalid-json}',
      fallback: 'value',
    }
    expect(decodeVariables(query)).toEqual(query)
  })

  test('handles prefixed properties as regular strings', () => {
    const query = {
      name: 'John',
      'n:age': '30',
      'b:isAdmin': 'true',
    }
    expect(decodeVariables(query)).toEqual(query)
  })
})

describe('decodeVariables (experimental mode)', () => {
  beforeEach(() => {
    // Enable experimental mode for these tests
    vi.mocked(config).experimentalQueryParamEncoding = true
  })

  test('parses JSON from __variables if present', () => {
    const query = {
      __variables: '{"name":"John","profile":{"title":"Developer"}}',
    }
    expect(decodeVariables(query)).toEqual({
      name: 'John',
      profile: { title: 'Developer' },
    })
  })

  test('preserves string properties without transformation', () => {
    const query = {
      name: 'John',
      title: 'Developer',
    }
    expect(decodeVariables(query)).toEqual(query)
  })

  test('converts n: prefixed properties to numbers', () => {
    const query = {
      name: 'John',
      'n:age': '30',
      'n:salary': '70000',
    }
    expect(decodeVariables(query)).toEqual({
      name: 'John',
      age: 30,
      salary: 70000,
    })
  })

  test('converts b: prefixed properties to booleans', () => {
    const query = {
      name: 'John',
      'b:isActive': 'true',
      'b:isAdmin': 'false',
    }
    expect(decodeVariables(query)).toEqual({
      name: 'John',
      isActive: true,
      isAdmin: false,
    })
  })

  test('handles mixed prefixed properties correctly', () => {
    const query = {
      name: 'Jon',
      'n:age': '20',
      'b:isUser': 'false',
    }
    expect(decodeVariables(query)).toEqual({
      name: 'Jon',
      age: 20,
      isUser: false,
    })
  })

  test('ignores __variables key when parsing prefixed properties', () => {
    const query = {
      name: 'John',
      'n:age': '30',
      'b:isActive': 'true',
      __variables: 'some-invalid-json', // This should be ignored since parsing would fail
    }
    expect(decodeVariables(query)).toEqual({
      name: 'John',
      age: 30,
      isActive: true,
    })
  })

  test('handles empty query object', () => {
    expect(decodeVariables({})).toEqual({})
  })
})
