import { describe, expect, test } from 'vitest'
import { validateOptions } from '~/src/build/helpers'

describe('validateOptions', () => {
  test('Throws an error if GraphQL endpoint is missing.', () => {
    expect(() => validateOptions({}, {} as any)).toThrowError(
      'Missing graphqlEndpoint',
    )
  })

  test('Throws an error if subscriptions are enabled, but Nitro websocket is not.', () => {
    expect(() =>
      validateOptions(
        {
          graphqlEndpoint: 'http://localhost',
          experimental: {
            subscriptions: true,
          },
        },
        {
          options: {
            nitro: {
              experimental: {},
            },
          },
        } as any,
      ),
    ).toThrowError('Nitro websocket support not enabled.')
  })

  test('Returns successfully for a valid configuration.', () => {
    expect(
      validateOptions({ graphqlEndpoint: '/graphql' }, {} as any),
    ).toBeFalsy()
  })
})
