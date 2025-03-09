import { describe, expect, test, vi } from 'vitest'
import { useGraphqlState } from './../../../src/runtime/composables/useGraphqlState'
import { useGraphqlMutation } from './../../../src/runtime/composables/useGraphqlMutation'
import { useGraphqlQuery } from './../../../src/runtime/composables/useGraphqlQuery'
import { useGraphqlUploadMutation } from './../../../src/runtime/composables/useGraphqlUploadMutation'

const useNuxtApp = function () {
  return {
    $graphqlState: {
      fetchOptions: {},
    },
  }
}

vi.stubGlobal('useNuxtApp', useNuxtApp)

vi.mock('#nuxt-graphql-middleware/helpers', () => {
  return {
    getEndpoint(operation: string, operationName: string) {
      return `/nuxt-graphql-middleware/${operation}/${operationName}`
    },
  }
})
vi.mock('#imports', () => {
  return {
    useRuntimeConfig: () => {
      return {
        public: {
          'nuxt-graphql-middleware': {
            serverApiPrefix: '/nuxt-graphql-middleware',
          },
        },
        graphqlMiddleware: {
          graphqlEndpoint: 'http//localhost/graphql',
        },
      }
    },
    useNuxtApp: () => {
      return {
        $graphqlState: {
          fetchOptions: {},
        },
      }
    },
    useAppConfig: () => {
      return {
        graphqlMiddleware: {},
      }
    },
    useGraphqlState: () => {
      return {
        fetchOptions: {},
      }
    },
  }
})

vi.mock('#nuxt-graphql-middleware/client-options', () => {
  return {
    clientOptions: {},
  }
})

const fetchMock = (endpoint: string, options: any) => {
  return Promise.resolve({
    data: undefined,
    options,
    endpoint,
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

  test('takes options into account', async () => {
    expect(
      await useGraphqlQuery(
        'foobar',
        { stringVar: 'foobar' },
        {
          fetchOptions: {
            params: {
              customParam: 'yes',
            },
          },
          clientContext: {
            language: 'fr',
          },
        },
      ),
    ).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/foobar",
        "errors": [],
        "options": {
          "method": "get",
          "params": {
            "__gqlc_language": "fr",
            "customParam": "yes",
            "stringVar": "foobar",
          },
        },
      }
    `)
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

  test('takes options into account', async () => {
    const result = await useGraphqlMutation(
      'foobar',
      { stringVar: 'foobar' },
      {
        fetchOptions: {
          params: {
            customParam: 'yes',
          },
        },
        clientContext: {
          language: 'fr',
        },
      },
    )
    expect(result.options.body).toMatchInlineSnapshot(`
      {
        "stringVar": "foobar",
      }
    `)
    expect(result.options.params).toMatchInlineSnapshot(`
      {
        "__gqlc_language": "fr",
        "customParam": "yes",
      }
    `)
  })
})

describe('useGraphqlUploadMutation', () => {
  test('takes options into account', async () => {
    const result = await useGraphqlUploadMutation(
      'foobar',
      { stringVar: 'foobar' },
      {
        fetchOptions: {
          params: {
            customParam: 'yes',
          },
        },
        clientContext: {
          language: 'fr',
        },
      },
    )
    expect(result).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/upload/foobar",
        "errors": [],
        "options": {
          "body": FormData {
            Symbol(state): [
              {
                "name": "operations",
                "value": "{}",
              },
              {
                "name": "variables",
                "value": "{"stringVar":"foobar"}",
              },
              {
                "name": "map",
                "value": "{}",
              },
            ],
          },
          "method": "POST",
          "params": {
            "__gqlc_language": "fr",
            "customParam": "yes",
          },
        },
      }
    `)
  })
})

describe('useGraphqlState', () => {
  test('Returns the state', () => {
    expect(useGraphqlState()).toEqual({
      fetchOptions: {},
    })
  })
})
