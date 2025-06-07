import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import eventHandler from './../../../src/runtime/server/api/mutation'
import type { GraphqlMiddlewareServerOptions } from '~/src/server-options'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      mutation: {
        barfoo: 'Mutation',
      },
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
  }
})

vi.mock('nitropack/runtime', () => {
  return {
    getEvent: () => null,
  }
})

vi.mock('#nuxt-graphql-middleware/server-options', () => {
  return {
    serverOptions: {
      onServerResponse: (event, response) => {
        return {
          ...(response._data as any),
          __customProperty: 'foobar',
        }
      },
    } satisfies GraphqlMiddlewareServerOptions,
  }
})

const fetchMock = {
  raw: (endpoint: string, options: any) => {
    if (options?.body?.variables?.variables?.includes('fetchError')) {
      return Promise.reject(new Error('Fetch Error'))
    }
    return Promise.resolve({
      _data: {
        data: {},
        options,
        endpoint,
      },
    })
  },
}

vi.stubGlobal('$fetch', fetchMock)

function testHandler(
  operation: string,
  name: string,
  variables: any = {},
  method = 'GET',
) {
  const ParsedBodySymbol = Symbol.for('h3ParsedBody')
  const req: Partial<IncomingMessage> = {}
  const res: Partial<ServerResponse> = {}
  req.method = method
  req.url =
    'http://localhost:3000/api/graphql-middleware?variables=' +
    JSON.stringify(variables)
  // @ts-expect-error Test.
  req[ParsedBodySymbol] = variables
  const event = new H3Event(req as any, res as any)
  event.context.params = {
    operation,
    name,
  }
  return eventHandler(event)
}

describe('defineEventHandler', () => {
  test('Should handle a valid mutation', async () => {
    expect(await testHandler('mutation', 'barfoo', {}, 'POST'))
      .toMatchInlineSnapshot(`
      {
        "__customProperty": "foobar",
        "data": {},
        "endpoint": "http://localhost/graphql",
        "options": {
          "body": {
            "operationName": "barfoo",
            "query": "Mutation",
            "variables": {},
          },
          "method": "POST",
        },
      }
    `)
  })
})
