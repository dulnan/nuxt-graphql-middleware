import { EventEmitter } from 'node:events'
import { vi, describe, expect, test } from 'vitest'
import { GraphqlMiddlewareOperation } from './../../../../src/runtime/settings'
import {
  queryParamToVariables,
  getEndpoint,
  getFetchOptions,
  onServerError,
  onServerResponse,
  withSignal,
  getClientAbortSignal,
  isClientAborted,
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

describe('onServerError', () => {
  const URL_MESSAGE =
    '[POST] "http://internal.example:4000/graphql": 400 Bad Request'

  function callDefault(error: any) {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      onServerError(
        {},
        {} as any,
        error,
        GraphqlMiddlewareOperation.Query,
        'foobar',
        null,
      )
    } catch (e) {
      return e as any
    }
    throw new Error('onServerError did not throw.')
  }

  test('only passes on the GraphQL errors of the response', () => {
    const errors = [{ message: 'Variable "$id" is invalid.' }]
    const result = callDefault({
      message: URL_MESSAGE,
      response: { _data: { errors, debug: { secret: true } } },
    })
    expect(result.statusCode).toBe(500)
    expect(result.statusMessage).toBe("Couldn't execute GraphQL query.")
    expect(result.data).toEqual({ errors })
    expect(JSON.stringify(result)).not.toContain('internal.example')
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(URL_MESSAGE),
    )
  })

  test('does not pass on other responses', () => {
    const result = callDefault({
      message: URL_MESSAGE,
      response: { _data: '<html>Bad Gateway</html>' },
    })
    expect(result.statusMessage).toBe("Couldn't execute GraphQL query.")
    expect(result.data).toBeUndefined()
  })

  test.each([
    [
      'before the response',
      {
        message:
          '[POST] "http://internal.example:4000/graphql": <no response> The operation was aborted due to timeout',
        cause: { name: 'TimeoutError' },
      },
    ],
    [
      'while reading the response',
      {
        name: 'TimeoutError',
        message: 'The operation was aborted due to timeout',
      },
    ],
  ])('responds with a 504 for timeouts %s', (_label, error) => {
    const result = callDefault(error)
    expect(result.statusCode).toBe(504)
    expect(result.statusMessage).toBe(
      "The GraphQL server didn't respond in time.",
    )
    expect(JSON.stringify(result)).not.toContain('internal.example')
  })

  test('does not log requests the client aborted', () => {
    const res = Object.assign(new EventEmitter(), { writableEnded: false })
    const event = { node: { req: {}, res } } as any
    getClientAbortSignal(event)
    res.emit('close')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleError.mockClear()
    let result: any
    try {
      onServerError(
        {},
        event,
        { message: URL_MESSAGE } as any,
        GraphqlMiddlewareOperation.Query,
        'foobar',
        null,
      )
    } catch (e) {
      result = e
    }
    expect(result.statusCode).toBe(499)
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('handles errors without a response', () => {
    const result = callDefault({
      message:
        '[POST] "http://10.0.0.5:8080/graphql": <no response> connect ECONNREFUSED',
    })
    expect(result.statusMessage).toBe("Couldn't execute GraphQL query.")
    expect(result.data).toBeUndefined()
    expect(JSON.stringify(result)).not.toContain('10.0.0.5')
  })

  test('calls the method from the server options', () => {
    const custom = vi.fn(() => ({ data: null, errors: [] }))
    const error = { message: URL_MESSAGE } as any
    expect(
      onServerError(
        { onServerError: custom },
        {} as any,
        error,
        GraphqlMiddlewareOperation.Query,
        'foobar',
        null,
      ),
    ).toEqual({ data: null, errors: [] })
    expect(custom).toHaveBeenCalledWith(
      {},
      error,
      GraphqlMiddlewareOperation.Query,
      'foobar',
      null,
    )
  })
})

describe('onServerResponse', () => {
  function response(data: unknown, contentType = 'application/json') {
    return {
      _data: data,
      headers: new Headers({ 'content-type': contentType }),
    } as any
  }

  function callDefault(data: unknown, contentType?: string) {
    return onServerResponse(
      {},
      {} as any,
      response(data, contentType),
      GraphqlMiddlewareOperation.Query,
      'foobar',
      null,
    )
  }

  test('passes on GraphQL responses', () => {
    const data = { data: { foo: 'bar' }, errors: [] }
    expect(callDefault(data)).toBe(data)
    const withoutPrototype = Object.assign(Object.create(null), data)
    expect(callDefault(withoutPrototype)).toBe(withoutPrototype)
  })

  test.each([
    ['text', '<script>alert(1)</script>', 'text/html'],
    ['an empty body', undefined, 'application/json'],
    ['null', null, 'application/json'],
    ['an array', [{ data: {} }], 'application/json'],
    ['a blob', new Blob(['foo']), 'application/octet-stream'],
  ])('refuses %s', (_label, data, contentType) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => callDefault(data, contentType)).toThrowError(
      expect.objectContaining({
        statusCode: 502,
        statusMessage: 'Invalid response from the GraphQL server.',
      }),
    )
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`(content type: ${contentType})`),
    )
  })

  test('calls the method from the server options', () => {
    const custom = vi.fn(() => 'custom')
    const res = response('<html></html>', 'text/html')
    expect(
      onServerResponse(
        { onServerResponse: custom },
        {} as any,
        res,
        GraphqlMiddlewareOperation.Query,
        'foobar',
        null,
      ),
    ).toBe('custom')
    expect(custom).toHaveBeenCalledWith(
      {},
      res,
      GraphqlMiddlewareOperation.Query,
      'foobar',
      null,
    )
  })
})

describe('withSignal', () => {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  test('adds a signal with the timeout', async () => {
    const result = withSignal({ headers: { foo: 'bar' } }, 20)
    expect(result.headers).toEqual({ foo: 'bar' })
    expect(result.signal).toBeInstanceOf(AbortSignal)
    expect(result.signal!.aborted).toBe(false)
    await wait(50)
    expect(result.signal!.aborted).toBe(true)
    expect((result.signal!.reason as Error).name).toBe('TimeoutError')
  })

  test('does nothing without a timeout or a client signal', () => {
    const options = { headers: { foo: 'bar' } }
    expect(withSignal(options, false)).toBe(options)
    expect(withSignal(options, undefined)).toBe(options)
    expect(withSignal({ timeout: 0 }, 20)).toEqual({ timeout: 0 })
  })

  test('uses the timeout from the fetch options instead', async () => {
    const result = withSignal({ timeout: 20 }, 60_000)
    // ofetch ignores its timeout if there is a signal.
    expect(result.timeout).toBeUndefined()
    await wait(50)
    expect(result.signal!.aborted).toBe(true)
  })

  test('uses the signal from the fetch options instead', async () => {
    const controller = new AbortController()
    const result = withSignal({ signal: controller.signal }, 20)
    await wait(50)
    expect(result.signal!.aborted).toBe(false)
    controller.abort()
    expect(result.signal!.aborted).toBe(true)
  })

  test('combines the timeout with the client signal', async () => {
    const client = new AbortController()
    const result = withSignal({}, 20, client.signal)
    expect(result.signal!.aborted).toBe(false)
    client.abort(new DOMException('Closed', 'AbortError'))
    expect(result.signal!.aborted).toBe(true)
    expect((result.signal!.reason as Error).name).toBe('AbortError')

    const timedOut = withSignal({}, 20, new AbortController().signal)
    await wait(50)
    expect((timedOut.signal!.reason as Error).name).toBe('TimeoutError')
  })

  test('uses the client signal if the timeout is disabled', () => {
    const client = new AbortController()
    const result = withSignal({ timeout: 0 }, 20, client.signal)
    expect(result.signal).toBe(client.signal)
  })
})

describe('getClientAbortSignal', () => {
  function createEvent(writableEnded: boolean) {
    const res = Object.assign(new EventEmitter(), { writableEnded })
    return { node: { req: {}, res } } as any
  }

  test('is aborted if the client closes the connection', () => {
    const event = createEvent(false)
    const signal = getClientAbortSignal(event)!
    expect(signal.aborted).toBe(false)
    expect(isClientAborted(event)).toBe(false)
    event.node.res.emit('close')
    expect(signal.aborted).toBe(true)
    expect((signal.reason as Error).name).toBe('AbortError')
    expect(isClientAborted(event)).toBe(true)
  })

  test('is not aborted if the response was sent', () => {
    const event = createEvent(true)
    const signal = getClientAbortSignal(event)!
    event.node.res.emit('close')
    expect(signal.aborted).toBe(false)
    expect(isClientAborted(event)).toBe(false)
  })

  test('handles events without a response stream', () => {
    expect(getClientAbortSignal(null)).toBeUndefined()
    expect(getClientAbortSignal({ node: { res: {} } } as any)).toBeUndefined()
  })
})
