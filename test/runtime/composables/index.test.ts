import { describe, expect, test, vi } from 'vitest'
import {
  useGraphqlQuery,
  useGraphqlMutation,
  useGraphqlState,
} from './../../../src/runtime/composables'

vi.mock('#imports', () => {
  return {
    useRuntimeConfig: () => {
      return {
        public: {
          'nuxt-graphql-middleware': {
            serverApiPrefix: '/api/graphql_middleware',
          },
        },
      }
    },
  }
})

const fetchMock = (endpoint: string, options: any) => {
  return Promise.resolve({
    _data: {
      data: {},
      options,
      endpoint,
    },
  })
}

vi.stubGlobal('$fetch', fetchMock)

describe('useGraphqlQuery', () => {
  test('Performs a query', async () => {
    expect(await useGraphqlQuery('foobar')).toMatchSnapshot()
  })

  test('Performs a query with string variables', async () => {
    expect(
      await useGraphqlQuery('foobar', { stringVar: 'foobar' }),
    ).toMatchSnapshot()
  })

  test('Performs a query with string variables', async () => {
    expect(
      await useGraphqlQuery('foobar', { stringVar: 'foobar' }),
    ).toMatchSnapshot()
  })

  test('Performs a query with non-string variables', async () => {
    expect(await useGraphqlQuery('foobar', { numeric: 123 })).toMatchSnapshot()
  })

  test('Throws an error for invalid query names.', async () => {
    const result = await useGraphqlQuery(123).catch((e) => e)
    expect(result).toMatchSnapshot()
  })
})

describe('useGraphqlMutation', () => {
  test('Performs a mutation', async () => {
    expect(await useGraphqlMutation('foobar')).toMatchSnapshot()
  })

  test('Performs a mutation with variables', async () => {
    expect(
      await useGraphqlMutation('foobar', { user: 'foobar' }),
    ).toMatchSnapshot()
  })

  test('Throws an error for invalid mutation names.', async () => {
    const result = await useGraphqlMutation(123).catch((e) => e)
    expect(result).toMatchSnapshot()
  })
})

describe('useGraphqlState', () => {
  test('Returns the state', () => {
    expect(useGraphqlState()).toEqual({
      fetchOptions: {},
    })
  })
})
