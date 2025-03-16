import { vi, describe, expect, test } from 'vitest'
import { GraphqlMiddlewareOperation } from './../../../../src/runtime/settings'
import {
  queryParamToVariables,
  getEndpoint,
  getFetchOptions,
} from './../../../../src/runtime/server/helpers'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      query: {
        foobar: 'Query',
      },
      mutation: {
        barfoo: 'Mutation',
      },
    },
  }
})

describe('queryParamToVariables', () => {
  test('returns the JSON stringified variables if they exist', () => {
    expect(
      queryParamToVariables({
        __variables: JSON.stringify({ one: 'one', two: 'two' }),
      }),
    ).toEqual({ one: 'one', two: 'two' })
  })

  test('returns the variables from the params', () => {
    expect(queryParamToVariables({ one: 'one', two: 'two' })).toEqual({
      one: 'one',
      two: 'two',
    })
  })

  test('returns the input if the variables are unparsable', () => {
    expect(
      queryParamToVariables({
        __variables: 'invalid',
      }),
    ).toEqual({
      __variables: 'invalid',
    })
  })
})

describe('getFetchOptions', () => {
  test('Returns the fetch options from a callback', () => {
    expect(
      getFetchOptions(
        {
          serverFetchOptions: () => {
            return {
              headers: {
                'x-foobar': 'yes',
              },
            }
          },
        },
        null as any,
        'query' as any,
        'foobar',
      ),
    ).toEqual({
      headers: {
        'x-foobar': 'yes',
      },
    })
  })

  test('Returns an empty object from a callback returning nothing', () => {
    expect(
      getFetchOptions(
        {
          serverFetchOptions: () => {
            return null as any
          },
        },
        null as any,
        'query' as any,
        'foobar',
      ),
    ).toEqual({})
  })

  test('Returns the fetch options object', () => {
    expect(
      getFetchOptions(
        {
          serverFetchOptions() {
            return {
              headers: {
                'x-foobar': 'yes',
              },
            }
          },
        },
        null as any,
        'query' as any,
        'foobar',
      ),
    ).toEqual({
      headers: {
        'x-foobar': 'yes',
      },
    })
  })

  test('Returns an empty options object', () => {
    expect(getFetchOptions({}, null as any, 'query' as any, 'foobar')).toEqual(
      {},
    )
  })
})

describe('getEndpoint', () => {
  test('returns the string endpoint from the module config', async () => {
    expect(
      await getEndpoint(
        {
          graphqlEndpoint: 'http://example.com/graphql',
        },
        {},
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toEqual('http://example.com/graphql')
  })

  test('returns the endpoint from the callback in module config', async () => {
    expect(
      await getEndpoint(
        {},
        {
          graphqlEndpoint: function () {
            return 'http://foobar.com/graphql'
          },
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toEqual('http://foobar.com/graphql')
  })

  test('throws an error if the callback did not return an endpoint', () => {
    expect(() =>
      getEndpoint(
        {},
        {
          graphqlEndpoint: function () {
            return null as any
          },
        },
        null as any,
        GraphqlMiddlewareOperation.Query,
        'test',
      ),
    ).toThrowError('Failed to determine endpoint for GraphQL server.')
  })
})
