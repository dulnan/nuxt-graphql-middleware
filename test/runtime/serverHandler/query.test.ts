import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import eventHandler from './../../../src/runtime/server/api/query'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      query: {
        foobar: 'Query',
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
          ...response._data,
          __customProperty: 'foobar',
        }
      },
    },
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
  req[ParsedBodySymbol] = variables
  const event = new H3Event(req as any, res as any)
  event.context.params = {
    operation,
    name,
  }
  return eventHandler(event)
}

describe('defineEventHandler', () => {
  test('Should handle a valid query', async () => {
    expect(await testHandler('query', 'foobar')).toMatchSnapshot()
  })

  test('Should handle an invalid query', async () => {
    const result = await testHandler('query', 'invalid').catch((e) => e)
    expect(result).toMatchSnapshot()
  })

  test('Should handle an invalid operation', async () => {
    const result = await testHandler('subscribe', 'foobar').catch((e) => e)
    expect(result).toMatchSnapshot()
  })

  test('Should correctly handle variables.', async () => {
    expect(
      await testHandler('query', 'foobar', { variable: 'one' }),
    ).toMatchSnapshot()
  })

  test('Should handle unexpected errors.', async () => {
    const result = await testHandler('query', 'foobar', {
      fetchError: true,
    }).catch((e) => e)
    expect(result).toMatchSnapshot()
  })
})
