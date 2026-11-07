import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { hash } from 'ohash'
import { useAsyncGraphqlQuery } from './../../../src/runtime/composables/useAsyncGraphqlQuery'
import { useGraphqlQuery } from './../../../src/runtime/composables/useGraphqlQuery'

type Call = {
  key: { value: string }
  handler: (app: unknown, ctx: unknown) => Promise<any>
  options: Record<string, any>
}

const REQUEST_KEYS = 'nuxt-graphql-middleware:request-keys'

const state = vi.hoisted(() => {
  return {
    app: {} as Record<string, any>,
    appConfig: {} as Record<string, any>,
    clientCacheEnabledAtBuild: true,
    server: false,
    context: {} as Record<string, string>,
    contextError: null as Error | null,
    // Shared by the server and the client, like the state in the payload.
    states: {} as Record<string, { value: any }>,
    calls: [] as Call[],
  }
})

vi.mock('#imports', async () => {
  const { computed, ref } = await import('vue')
  return {
    computed,
    useNuxtApp: () => state.app,
    useAppConfig: () => state.appConfig,
    useState: (key: string, init?: () => unknown) => {
      if (!state.states[key]) {
        state.states[key] = ref(init ? init() : undefined)
      }
      return state.states[key]
    },
    useAsyncData: (key: any, handler: any, options: any) => {
      state.calls.push({ key, handler, options })
      return {}
    },
  }
})

vi.mock('#nuxt-graphql-middleware/config', () => {
  return {
    get clientCacheEnabledAtBuild() {
      return state.clientCacheEnabledAtBuild
    },
    get importMetaClient() {
      return !state.server
    },
    get importMetaServer() {
      return state.server
    },
    experimentalQueryParamEncoding: false,
  }
})

vi.mock('#nuxt-graphql-middleware/client-options', () => {
  return {
    clientOptions: {
      buildClientContext() {
        if (state.contextError) {
          throw state.contextError
        }
        return { ...state.context }
      },
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

vi.mock('#nuxt-graphql-middleware/operation-hashes', () => {
  return {
    operationHashes: { foobar: 'abc' },
  }
})

// Every request returns a new time.
let time = 0
const fetchMock = vi.fn((_endpoint: string, _options: any) => {
  time++
  return Promise.resolve({ data: { time }, errors: [] })
})

vi.stubGlobal('$fetch', fetchMock)

const toTime = (v: any) => v.data.time
const toObject = (v: any) => ({ time: v.data.time })

function createApp(isHydrating: boolean, data: Record<string, unknown> = {}) {
  state.app = {
    isHydrating,
    payload: { data },
    $graphqlState: { fetchOptions: {} },
    callHook: vi.fn(),
  }
  return state.app
}

function call(options: Record<string, any> = {}, variables: any = null): Call {
  useAsyncGraphqlQuery('foobar' as any, variables, {
    graphqlCaching: { client: true },
    ...options,
  } as any)
  return state.calls[state.calls.length - 1]!
}

function lookup(c: Call, cause = 'initial') {
  return c.options.getCachedData?.(c.key.value, state.app, { cause })
}

/**
 * Do what useAsyncData does: use the cached data, or perform the request.
 */
async function visit(options: Record<string, any> = {}, variables: any = null) {
  const c = call(options, variables)
  const cached = lookup(c)
  if (cached !== undefined) {
    return { call: c, data: cached, cached: true }
  }
  let data = await c.handler(state.app, {})
  if (c.options.transform) {
    data = await c.options.transform(data)
  }
  if (c.options.pick) {
    data = Object.fromEntries(
      c.options.pick.map((key: string) => [key, data[key]]),
    )
  }
  return { call: c, data, cached: false }
}

/**
 * Render the query on the server, then hydrate the payload in a new app.
 */
async function renderOnServer(
  options: Record<string, any> = {},
  variables: any = null,
) {
  state.server = true
  state.app = { payload: { data: {} }, $graphqlState: { fetchOptions: {} } }
  const c = call(options, variables)
  const response = await c.handler(state.app, {})
  const data = options.transform ? options.transform(response) : response
  state.server = false
  const app = createApp(true, { [c.key.value]: data })
  return { app, data, key: c.key.value }
}

describe('useAsyncGraphqlQuery with graphqlCaching.client', () => {
  beforeEach(() => {
    state.clientCacheEnabledAtBuild = true
    state.server = false
    state.appConfig = {
      graphqlMiddleware: {
        clientCacheEnabled: true,
        clientCacheMaxSize: 100,
      },
    }
    state.context = { language: 'de' }
    state.contextError = null
    state.states = {}
    state.calls = []
    time = 0
    fetchMock.mockClear()
    createApp(false)
  })

  test('does not look up cached data if the client cache is disabled in the module options', () => {
    state.clientCacheEnabledAtBuild = false
    expect(call().options.getCachedData).toBeUndefined()
  })

  test('does not look up cached data if the client cache is disabled in the app config', () => {
    state.appConfig.graphqlMiddleware.clientCacheEnabled = false
    expect(call().options.getCachedData).toBeUndefined()
  })

  test('records the request of a response on the server, as the browser builds it', async () => {
    const { key } = await renderOnServer()
    const requestKey = state.states[REQUEST_KEYS]?.value?.[key]

    createApp(false)
    await visit()
    expect(Object.keys(state.app.$graphqlCache.cache)).toContain(requestKey)
  })

  test('returns the response from the payload during hydration and later', async () => {
    const { app, data } = await renderOnServer()
    expect((await visit()).data).toEqual(data)

    app.isHydrating = false
    const later = await visit()
    expect(later.cached).toBe(true)
    expect(later.data).toEqual(data)
    // Only the request on the server.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('performs the query again after the client context changed', async () => {
    const { app, data } = await renderOnServer({ transform: toTime })
    await visit({ transform: toTime })
    app.isHydrating = false

    state.context = { language: 'fr' }
    const fr = await visit({ transform: toTime })
    expect(fr.cached).toBe(false)
    expect(fr.data).not.toEqual(data)

    // Both responses are cached.
    state.context = { language: 'de' }
    expect(await visit({ transform: toTime })).toMatchObject({
      cached: true,
      data,
    })
    state.context = { language: 'fr' }
    expect(await visit({ transform: toTime })).toMatchObject({
      cached: true,
      data: fr.data,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('caches the response from the payload for the request of the server', async () => {
    const { app, data } = await renderOnServer()

    // The browser has another context than the server.
    state.context = { language: 'fr' }
    expect((await visit()).data).toEqual(data)

    app.isHydrating = false
    expect((await visit()).cached).toBe(false)
  })

  test('caches the response from the payload during hydration only if the server request is known', async () => {
    // For example on a prerendered page that shares the data of another page.
    const app = createApp(true, {
      [`useAsyncGraphqlQuery:foobar:${hash(null)}`]: 'shared',
    })
    expect((await visit()).data).toBe('shared')

    app.isHydrating = false
    expect((await visit()).cached).toBe(false)
  })

  test('returns the payload after hydration for the request of the server, without caching it', async () => {
    // For example for a component with delayed hydration.
    const { app, data } = await renderOnServer()
    app.isHydrating = false

    expect(await visit()).toMatchObject({ cached: true, data })
    // Not cached, as the payload might be from a component that was never
    // hydrated.
    expect((await visit()).cached).toBe(false)
  })

  test('does not return the payload after hydration for another request', async () => {
    const { app } = await renderOnServer()
    app.isHydrating = false

    state.context = { language: 'fr' }
    expect((await visit()).cached).toBe(false)
  })

  test('returns a response fetched in the browser right away', async () => {
    const first = await visit({ transform: toTime })
    expect(first.cached).toBe(false)

    expect(await visit({ transform: toTime })).toMatchObject({
      cached: true,
      data: first.data,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('returns a response cached by useGraphqlQuery right away', async () => {
    await useGraphqlQuery('foobar' as any, {} as any, {
      graphqlCaching: { client: true },
    })

    expect((await visit({ transform: toTime })).cached).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('transforms a cached response with the transform of the call', async () => {
    const { app, data } = await renderOnServer({ transform: toTime })
    await visit({ transform: toTime })
    app.isHydrating = false

    // The data from the payload was made by another transform.
    const other = await visit({ transform: toObject })
    expect(other.cached).toBe(false)
    expect(other.data).toEqual({ time: 2 })

    expect(await visit({ transform: toTime })).toMatchObject({
      cached: true,
      data,
    })
    expect(await visit({ transform: toObject })).toMatchObject({
      cached: true,
      data: { time: 2 },
    })
  })

  test('shares cached responses between variables that make the same request', async () => {
    await visit({ transform: toTime }, null)

    // Another async data key, but the same request.
    const other = await visit({ transform: toObject }, {})
    expect(other).toMatchObject({ cached: true, data: { time: 1 } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('picks the keys of a cached response', async () => {
    await visit({ pick: ['data'] })
    expect(await visit({ pick: ['data'] })).toMatchObject({
      cached: true,
      data: { data: { time: 1 } },
    })
  })

  test.each([
    ['an async transform', async (v: any) => v.data.time],
    ['a transform that returns a promise', (v: any) => Promise.resolve(v)],
  ])('does not return a cached response for %s', async (_label, transform) => {
    await visit({ transform })
    expect(lookup(call({ transform }))).toBeUndefined()
  })

  test('does not return a cached response if the transform throws', async () => {
    let calls = 0
    const transform = (v: any) => {
      calls++
      if (calls > 1) {
        throw new Error('Failed')
      }
      return v
    }
    await visit({ transform })
    expect(lookup(call({ transform }))).toBeUndefined()
  })

  test('does not return a cached response with the middleware option', async () => {
    const middleware = [(next: () => unknown) => next()]
    await visit({ middleware })
    expect(lookup(call({ middleware }))).toBeUndefined()
  })

  test('returns nothing if the client context can not be built', async () => {
    await visit()
    state.contextError = new Error('No context')

    const c = call()
    expect(lookup(c)).toBeUndefined()
    // The handler then fails, as without the lookup.
    expect(() => c.handler(state.app, {})).toThrow('No context')
  })

  test('returns nothing for a request that is still running', async () => {
    const first = call()
    lookup(first)
    const running = first.handler(state.app, {})

    expect(lookup(call())).toBeUndefined()
    await running
  })

  test('returns nothing after the cache was purged', async () => {
    const { app } = await renderOnServer()
    await visit()
    app.isHydrating = false
    await visit({}, { id: '1' })

    app.$graphqlCache.purge()
    expect((await visit()).cached).toBe(false)
    expect((await visit({}, { id: '1' })).cached).toBe(false)
  })

  test('returns nothing for a response that was removed from the full cache', async () => {
    state.appConfig.graphqlMiddleware.clientCacheMaxSize = 1
    await visit({}, { id: '1' })
    await visit({}, { id: '2' })
    expect((await visit({}, { id: '1' })).cached).toBe(false)
  })

  test.each(['refresh:manual', 'refresh:hook'])(
    'performs the query again on %s',
    async (cause) => {
      const { app } = await renderOnServer()
      await visit()
      app.isHydrating = false

      const c = call()
      expect(lookup(c, cause)).toBeUndefined()
      await c.handler(state.app, {})
      expect(fetchMock).toHaveBeenCalledTimes(2)
    },
  )

  test.each(['refresh:manual', 'refresh:hook'])(
    'performs a query cached by useGraphqlQuery again on %s',
    async (cause) => {
      await useGraphqlQuery('foobar' as any, {} as any, {
        graphqlCaching: { client: true },
      })

      const c = call()
      expect(lookup(c, cause)).toBeUndefined()
      await c.handler(state.app, {})
      expect(fetchMock).toHaveBeenCalledTimes(2)
    },
  )

  test('returns nothing for the watch option', async () => {
    await visit()
    expect(lookup(call(), 'watch')).toBeUndefined()
  })

  test('returns nothing for a key that is no longer the key of the call', async () => {
    const { app } = await renderOnServer({}, { id: '1' })
    const variables = ref({ id: '1' })
    const c = call({}, variables)
    lookup(c)
    app.isHydrating = false

    const oldKey = c.key.value
    variables.value = { id: '2' }
    expect(
      c.options.getCachedData(oldKey, app, { cause: 'initial' }),
    ).toBeUndefined()
  })

  test('does not change the options object of the call', () => {
    const options = { graphqlCaching: { client: true }, transform: toTime }
    useAsyncGraphqlQuery('foobar' as any, { id: '1' } as any, options as any)
    const first = state.calls[state.calls.length - 1]!
    useAsyncGraphqlQuery('foobar' as any, { id: '2' } as any, options as any)
    const second = state.calls[state.calls.length - 1]!

    expect(options).not.toHaveProperty('getCachedData')
    // Each call has its own lookup.
    expect(second.options.getCachedData).not.toBe(first.options.getCachedData)
  })

  test('keeps a getCachedData from the options', async () => {
    const getCachedData = () => 'custom'
    expect(call({ getCachedData }).options.getCachedData).toBe(getCachedData)

    // No request is recorded on the server either.
    const { key } = await renderOnServer({ getCachedData })
    expect(state.states[REQUEST_KEYS]?.value?.[key]).toBeUndefined()
  })
})
