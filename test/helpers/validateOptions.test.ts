import { describe, expect, test } from 'vitest'
import { validateOptions } from '../../src/build/helpers'

describe('validateOptions', () => {
  test('Throws an error if GraphQL endpoint is missing.', () => {
    expect(() => validateOptions({})).toThrow('Missing graphqlEndpoint')
  })

  test('Returns successfully for a valid configuration.', () => {
    expect(validateOptions({ graphqlEndpoint: '/graphql' })).toBeFalsy()
  })

  test.each<number | false | undefined>([
    30_000,
    0,
    false,
    undefined,
    2_147_483_647,
  ])('Accepts a graphqlServerTimeout of %s.', (value) => {
    expect(() =>
      validateOptions({
        graphqlEndpoint: '/graphql',
        graphqlServerTimeout: value,
      }),
    ).not.toThrow()
  })

  test.each([-1, 1.5, Number.NaN, Infinity, 2_147_483_648, '1000', true])(
    'Throws an error for a graphqlServerTimeout of %s.',
    (value) => {
      expect(() =>
        validateOptions({
          graphqlEndpoint: '/graphql',
          graphqlServerTimeout: value as any,
        }),
      ).toThrow('Invalid graphqlServerTimeout')
    },
  )

  test.each<number | false | undefined>([10_485_760, 0, false, undefined])(
    'Accepts a body size limit of %s.',
    (value) => {
      expect(() =>
        validateOptions({
          graphqlEndpoint: '/graphql',
          bodySizeLimit: { mutation: value, upload: value },
        }),
      ).not.toThrow()
    },
  )

  test.each([-1, 1.5, Number.NaN, Infinity, '1000'])(
    'Throws an error for a body size limit of %s.',
    (value) => {
      expect(() =>
        validateOptions({
          graphqlEndpoint: '/graphql',
          bodySizeLimit: { upload: value as any },
        }),
      ).toThrow('Invalid bodySizeLimit.upload')
    },
  )
})
