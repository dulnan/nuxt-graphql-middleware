import { describe, expect, test, vi } from 'vitest'
import { useGraphqlState } from './../../../src/runtime/composables/useGraphqlState'
import { useGraphqlMutation } from './../../../src/runtime/composables/useGraphqlMutation'
import { useGraphqlQuery } from './../../../src/runtime/composables/useGraphqlQuery'
import { useGraphqlUploadMutation } from './../../../src/runtime/composables/useGraphqlUploadMutation'

vi.mock('#nuxt-graphql-middleware/helpers', () => {
  return {
    getEndpoint(operation: string, operationName: string) {
      return `/nuxt-graphql-middleware/${operation}/${operationName}`
    },
  }
})

vi.mock('#nuxt-graphql-middleware/config', () => {
  return {
    clientCacheEnabledAtBuild: true,
    importMetaClient: true,
    experimentalQueryParamEncoding: false,
  }
})

vi.mock('#nuxt-graphql-middleware/operation-hashes', () => {
  return {
    operationHashes: {
      foobar: 'abc123',
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
          graphqlEndpoint: 'http://localhost/graphql',
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
    expect(await useGraphqlQuery('foobar')).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/foobar",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlh": "abc123",
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Performs a query with string variables', async () => {
    expect(await useGraphqlQuery('userById', { id: '1' }))
      .toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/userById",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlh": undefined,
            "id": "1",
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Performs a query with string variables', async () => {
    expect(await useGraphqlQuery('userById', { id: '10' }))
      .toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/userById",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlh": undefined,
            "id": "10",
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Performs a query with non-string variables', async () => {
    expect(await useGraphqlQuery('returnSameValue', { value: 123 }))
      .toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/returnSameValue",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlh": undefined,
            "__variables": "{"value":123}",
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Throws an error for invalid query names.', async () => {
    // @ts-expect-error Obviously wrong.
    const result = await useGraphqlQuery(123).catch((e) => e)
    expect(result).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/query/undefined",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlh": undefined,
          },
          "query": undefined,
        },
      }
    `)
  })

  test('takes options into account', async () => {
    expect(
      await useGraphqlQuery(
        'userById',
        { id: '123' },
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
        "endpoint": "/nuxt-graphql-middleware/query/userById",
        "errors": [],
        "options": {
          "body": undefined,
          "method": "get",
          "params": {
            "__gqlc_language": "fr",
            "__gqlh": undefined,
            "customParam": "yes",
            "id": "123",
          },
          "query": undefined,
        },
      }
    `)
  })
})

describe('useGraphqlMutation', () => {
  test('Performs a mutation', async () => {
    expect(await useGraphqlMutation('initState')).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/mutation/initState",
        "errors": [],
        "options": {
          "body": {},
          "method": "post",
          "params": {
            "__gqlh": undefined,
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Performs a mutation with variables', async () => {
    expect(await useGraphqlMutation('deleteUser', { id: 123 }))
      .toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/mutation/deleteUser",
        "errors": [],
        "options": {
          "body": {
            "id": 123,
          },
          "method": "post",
          "params": {
            "__gqlh": undefined,
          },
          "query": undefined,
        },
      }
    `)
  })

  test('Throws an error for invalid mutation names.', async () => {
    // @ts-expect-error
    const result = await useGraphqlMutation(123).catch((e) => e)
    expect(result).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/mutation/undefined",
        "errors": [],
        "options": {
          "body": {},
          "method": "post",
          "params": {
            "__gqlh": undefined,
          },
          "query": undefined,
        },
      }
    `)
  })

  test('takes options into account', async () => {
    const result = await useGraphqlMutation(
      'deleteUser',
      { id: 123 },
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
    // @ts-expect-error Type used for testing.
    expect(result.options.body).toMatchInlineSnapshot(`
      {
        "id": 123,
      }
    `)
    // @ts-expect-error Type used for testing.
    expect(result.options.params).toMatchInlineSnapshot(`
      {
        "__gqlc_language": "fr",
        "__gqlh": undefined,
        "customParam": "yes",
      }
    `)
  })
})

describe('useGraphqlUploadMutation', () => {
  test('takes options into account', async () => {
    const result = await useGraphqlUploadMutation(
      'testUpload',
      { file: 'foobar' },
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

    // @ts-expect-error Test type.
    const formData: FormData = result.options.body
    const entries = [...formData.entries()]
    expect(entries).toMatchInlineSnapshot(`
      [
        [
          "operations",
          "{}",
        ],
        [
          "variables",
          "{"file":"foobar"}",
        ],
        [
          "map",
          "{}",
        ],
      ]
    `)
    expect(result).toMatchInlineSnapshot(`
      {
        "data": undefined,
        "endpoint": "/nuxt-graphql-middleware/upload/testUpload",
        "errors": [],
        "options": {
          "body": FormData {},
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
