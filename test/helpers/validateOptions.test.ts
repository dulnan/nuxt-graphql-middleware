import { describe, expect, test } from 'vitest'
import { validateOptions } from '../../src/build/helpers'

describe('validateOptions', () => {
  test('Throws an error if GraphQL endpoint is missing.', () => {
    expect(() => validateOptions({})).toThrowError('Missing graphqlEndpoint')
  })

  test('Returns successfully for a valid configuration.', () => {
    expect(validateOptions({ graphqlEndpoint: '/graphql' })).toBeFalsy()
  })
})
