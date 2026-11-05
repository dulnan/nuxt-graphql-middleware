import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, test, vi } from 'vitest'
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

const bodySizeLimit = vi.hoisted(() => {
  return { mutation: false as number | false }
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
          graphqlServerTimeout: false,
          bodySizeLimit,
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

function runHandler(
  name: string,
  req: Partial<IncomingMessage> & Record<string, any>,
) {
  const res: Partial<ServerResponse> = {
    setHeader: vi.fn(),
  }
  req.method = 'POST'
  req.url = 'http://localhost:3000/api/graphql_middleware/mutation/' + name
  const event = new H3Event(req as any, res as any)
  event.context.params = {
    name,
  }
  return eventHandler(event)
}

function testHandler(
  operation: string,
  name: string,
  variables: any = {},
  method = 'GET',
  contentType: string | null = 'application/json',
) {
  const req: Partial<IncomingMessage> & { body?: Buffer } = {}
  const res: Partial<ServerResponse> = {}
  req.method = method
  req.headers = contentType ? { 'content-type': contentType } : {}
  req.url =
    'http://localhost:3000/api/graphql-middleware?variables=' +
    JSON.stringify(variables)
  req.body = Buffer.from(JSON.stringify(variables))
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

  test('Should refuse invalid JSON', async () => {
    await expect(
      runHandler('barfoo', {
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{"id":'),
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test('Should drop keys that change the prototype', async () => {
    const result = await runHandler('barfoo', {
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(
        '{"id":"1","__proto__":{"polluted":true},"constructor":{"prototype":{}}}',
      ),
    })
    const variables = result.options.body.variables
    expect(Object.keys(variables)).toEqual(['id'])
    expect(variables.polluted).toBeUndefined()
  })
})

describe('body size limit', () => {
  afterEach(() => {
    bodySizeLimit.mutation = false
  })

  test('Should accept a body up to the limit', async () => {
    const body = JSON.stringify({ text: 'a'.repeat(90) })
    bodySizeLimit.mutation = body.length
    const result = await runHandler('barfoo', {
      headers: {
        'content-type': 'application/json',
        'content-length': String(body.length),
      },
      body: Buffer.from(body),
    })
    expect(result.options.body.variables.text).toHaveLength(90)
  })

  test('Should refuse a request whose content length is too large', async () => {
    bodySizeLimit.mutation = 100
    await expect(
      runHandler('barfoo', {
        headers: {
          'content-type': 'application/json',
          'content-length': '101',
        },
        body: Buffer.from('{}'),
      }),
    ).rejects.toMatchObject({ statusCode: 413 })
  })

  test('Should refuse a body that was read before and is too large', async () => {
    bodySizeLimit.mutation = 100
    await expect(
      runHandler('barfoo', {
        headers: { 'content-type': 'application/json' },
        body: Buffer.from(JSON.stringify({ text: 'a'.repeat(100) })),
      }),
    ).rejects.toMatchObject({ statusCode: 413 })
  })

  test('Should stop reading a chunked body once it is too large', async () => {
    bodySizeLimit.mutation = 1000
    let chunks = 0
    const stream = Readable.from(
      (function* () {
        while (true) {
          chunks++
          yield Buffer.from('a'.repeat(100))
        }
      })(),
    )
    const req = Object.assign(stream, {
      headers: {
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
      },
    })
    await expect(runHandler('barfoo', req)).rejects.toMatchObject({
      statusCode: 413,
    })
    expect(stream.destroyed).toBe(true)
    expect(chunks).toBeLessThan(20)
  })

  test.each<number | false>([false, 0])(
    'Should not limit the body if the limit is %s',
    async (limit) => {
      bodySizeLimit.mutation = limit
      const body = JSON.stringify({ text: 'a'.repeat(100_000) })
      const result = await runHandler('barfoo', {
        headers: {
          'content-type': 'application/json',
          'content-length': String(body.length),
        },
        body: Buffer.from(body),
      })
      expect(result.options.body.variables.text).toHaveLength(100_000)
    },
  )

  test('Should use the default limit instead of an invalid one', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    bodySizeLimit.mutation = -1
    await expect(
      runHandler('barfoo', {
        headers: {
          'content-type': 'application/json',
          'content-length': String(10 * 1024 * 1024 + 1),
        },
        body: Buffer.from('{}'),
      }),
    ).rejects.toMatchObject({ statusCode: 413 })
    expect(consoleWarn).toHaveBeenCalledWith(
      '[nuxt-graphql-middleware] Invalid bodySizeLimit.mutation: -1. Using 10485760 instead.',
    )
  })
})
