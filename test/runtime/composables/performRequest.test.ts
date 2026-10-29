import { beforeEach, describe, expect, test, vi } from 'vitest'
import { performRequest } from './../../../src/runtime/composables/nuxtApp'
import { SSR_EVENT_KEY } from './../../../src/runtime/settings'

const state = vi.hoisted(() => {
  return {
    app: {} as Record<string, any>,
    clientCacheEnabled: false,
    server: false,
  }
})

vi.mock('#imports', () => {
  return {
    useNuxtApp: () => state.app,
    useAppConfig: () => {
      return {
        graphqlMiddleware: {
          clientCacheEnabled: state.clientCacheEnabled,
          clientCacheMaxSize: 100,
        },
      }
    },
  }
})

vi.mock('#nuxt-graphql-middleware/helpers', () => {
  return {
    getEndpoint(operation: string, operationName: string) {
      return `/api/graphql_middleware/${operation}/${operationName}`
    },
  }
})

vi.mock('#nuxt-graphql-middleware/config', () => {
  return {
    clientCacheEnabledAtBuild: true,
    get importMetaClient() {
      return !state.server
    },
    get importMetaServer() {
      return state.server
    },
    experimentalQueryParamEncoding: false,
  }
})

vi.mock('#nuxt-graphql-middleware/operation-hashes', () => {
  return {
    operationHashes: {},
  }
})

const fetchMock = vi.fn((_endpoint: string, _options: any) =>
  Promise.resolve({ data: { foo: 'bar' }, errors: [] }),
)

vi.stubGlobal('$fetch', fetchMock)

function query(
  signal?: AbortSignal,
  fetchOptions: Record<string, any> = {},
  client = false,
  operation: 'query' | 'mutation' = 'query',
) {
  return performRequest(
    operation,
    'foobar',
    {},
    fetchOptions,
    {},
    {},
    { client },
    'asyncDataKey',
    signal,
  )
}

describe('performRequest', () => {
  beforeEach(() => {
    state.app = { $graphqlState: { fetchOptions: {} } }
    state.clientCacheEnabled = false
    state.server = false
    fetchMock.mockClear()
  })

  test('passes the signal to the request', async () => {
    const controller = new AbortController()
    await query(controller.signal)
    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal)
  })

  test('keeps a signal from the fetch options', async () => {
    const own = new AbortController()
    await query(new AbortController().signal, { signal: own.signal })
    expect(fetchMock.mock.calls[0]![1].signal).toBe(own.signal)
  })

  test('does not pass the signal to cached requests', async () => {
    state.clientCacheEnabled = true
    await query(new AbortController().signal, {}, true)
    expect(fetchMock.mock.calls[0]![1].signal).toBeUndefined()
  })

  test('keeps successful requests in the cache', async () => {
    state.clientCacheEnabled = true
    await query(undefined, {}, true)
    await query(undefined, {}, true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('removes failed requests from the cache', async () => {
    state.clientCacheEnabled = true
    fetchMock.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error')),
    )
    await expect(query(undefined, {}, true)).rejects.toThrow('Network error')
    const result = await query(undefined, {}, true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.data).toEqual({ foo: 'bar' })
  })

  test('passes the page request to queries during SSR', async () => {
    const event = { path: '/' }
    state.server = true
    state.app.ssrContext = { event }
    await query()
    await query(undefined, {}, false, 'mutation')
    expect(fetchMock.mock.calls[0]![1].context).toEqual({
      [SSR_EVENT_KEY]: event,
    })
    expect(fetchMock.mock.calls[1]![1].context).toBeUndefined()
  })
})
