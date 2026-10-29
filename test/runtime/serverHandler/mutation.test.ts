import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import eventHandler from './../../../src/runtime/server/api/mutation'

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
  contentType: string | null = 'application/json',
) {
  const ParsedBodySymbol = Symbol.for('h3ParsedBody')
  const req: Partial<IncomingMessage> = {}
  const res: Partial<ServerResponse> = {}
  req.method = method
  req.headers = contentType ? { 'content-type': contentType } : {}
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
  test('Should handle a valid mutation', async () => {
    expect(
      await testHandler('mutation', 'barfoo', {}, 'POST'),
    ).toMatchSnapshot()
  })

  test('Should accept JSON with parameters', async () => {
    const result = await testHandler(
      'mutation',
      'barfoo',
      { id: '1' },
      'POST',
      'Application/JSON; charset=utf-8',
    )
    expect(result.options.body.variables).toEqual({ id: '1' })
  })

  test('Should accept a request without variables', async () => {
    const result = await testHandler('mutation', 'barfoo', null, 'POST')
    expect(result.options.body.variables).toBeUndefined()
  })

  test.each([
    ['text/plain'],
    ['text/plain;charset=UTF-8'],
    ['application/x-www-form-urlencoded'],
    ['multipart/form-data; boundary=foobar'],
    ['application/jsonp'],
    [null],
  ])('Should refuse the content type %s', async (contentType) => {
    await expect(
      testHandler('mutation', 'barfoo', {}, 'POST', contentType),
    ).rejects.toMatchObject({ statusCode: 415 })
  })

  test.each([['{"id":"1"}'], [['foobar']], [1], [true]])(
    'Should refuse a body that is not an object: %j',
    async (body) => {
      await expect(
        testHandler('mutation', 'barfoo', body, 'POST'),
      ).rejects.toMatchObject({ statusCode: 400 })
    },
  )
})
