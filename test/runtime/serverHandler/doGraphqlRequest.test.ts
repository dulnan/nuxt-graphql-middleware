import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import { GraphqlMiddlewareOperation } from './../../../src/runtime/settings'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      query: {
        testQuery: 'query TestQuery { test }',
      },
      mutation: {
        testMutation: 'mutation TestMutation { test }',
      },
    },
  }
})

vi.mock('#nuxt-graphql-middleware/operation-variables', () => {
  return {
    operationVariables: {},
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
  }
})

vi.mock('nitropack/runtime', () => {
  return {
    useEvent: () => null,
  }
})

// Track what arguments serverFetchOptions and graphqlEndpoint receive.
const serverFetchOptionsCalls: Array<{
  operation: any
  operationName: any
}> = []

const graphqlEndpointCalls: Array<{
  operation: any
  operationName: any
}> = []

vi.mock('#nuxt-graphql-middleware/server-options', () => {
  return {
    serverOptions: {
      serverFetchOptions: (
        _event: any,
        operation: any,
        operationName: any,
      ) => {
        serverFetchOptionsCalls.push({ operation, operationName })
        return {}
      },
      graphqlEndpoint: (
        _event: any,
        operation: any,
        operationName: any,
      ) => {
        graphqlEndpointCalls.push({ operation, operationName })
        return 'http://localhost/graphql'
      },
    },
  }
})

const fetchMock = {
  raw: () =>
    Promise.resolve({
      _data: { data: {} },
    }),
}

vi.stubGlobal('$fetch', fetchMock)

function createEvent(): H3Event {
  const req: Partial<IncomingMessage> = { method: 'GET', url: '/' }
  const res: Partial<ServerResponse> = {}
  return new H3Event(req as any, res as any)
}

describe('doGraphqlRequest', () => {
  test('passes operation to serverFetchOptions and graphqlEndpoint for queries', async () => {
    serverFetchOptionsCalls.length = 0
    graphqlEndpointCalls.length = 0

    const { doGraphqlRequest } = await import(
      './../../../src/runtime/server/utils/doGraphqlRequest'
    )

    await doGraphqlRequest(
      {
        query: 'query TestQuery { test }',
        variables: {},
        operation: GraphqlMiddlewareOperation.Query,
        operationName: 'testQuery',
      },
      null,
      createEvent(),
    )

    // serverFetchOptions should receive the operation, not null.
    expect(serverFetchOptionsCalls).toHaveLength(1)
    expect(serverFetchOptionsCalls[0].operation).toBe('query')
    expect(serverFetchOptionsCalls[0].operationName).toBe('testQuery')

    // graphqlEndpoint should receive the operation, not null.
    expect(graphqlEndpointCalls).toHaveLength(1)
    expect(graphqlEndpointCalls[0].operation).toBe('query')
    expect(graphqlEndpointCalls[0].operationName).toBe('testQuery')
  })

  test('passes operation to serverFetchOptions and graphqlEndpoint for mutations', async () => {
    serverFetchOptionsCalls.length = 0
    graphqlEndpointCalls.length = 0

    const { doGraphqlRequest } = await import(
      './../../../src/runtime/server/utils/doGraphqlRequest'
    )

    await doGraphqlRequest(
      {
        query: 'mutation TestMutation { test }',
        variables: {},
        operation: GraphqlMiddlewareOperation.Mutation,
        operationName: 'testMutation',
      },
      null,
      createEvent(),
    )

    expect(serverFetchOptionsCalls).toHaveLength(1)
    expect(serverFetchOptionsCalls[0].operation).toBe('mutation')
    expect(serverFetchOptionsCalls[0].operationName).toBe('testMutation')

    expect(graphqlEndpointCalls).toHaveLength(1)
    expect(graphqlEndpointCalls[0].operation).toBe('mutation')
    expect(graphqlEndpointCalls[0].operationName).toBe('testMutation')
  })
})
