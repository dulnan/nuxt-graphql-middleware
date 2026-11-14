import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { hash } from 'ohash'
import { useAsyncGraphqlQuery } from './../../../src/runtime/composables/useAsyncGraphqlQuery'
import { useGraphqlQuery } from './../../../src/runtime/composables/useGraphqlQuery'
import { REQUEST_KEYS_STATE } from './../../../src/runtime/settings'

type Call = {
  key: { value: string }
  handler: (app: unknown, ctx: unknown) => Promise<any>
  options: Record<string, any>
}

const state = vi.hoisted(() => {
  return {
    app: {} as Record<string, any>,
    appConfig: {} as Record<string, any>,
    clientCacheEnabledAtBuild: true,
    server: false,
    context: {} as Record<string, string>,
    contextError: null as Error | null,
    // How often buildClientContext() was called.
    contextCalls: 0,
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
        state.contextCalls++
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
    payload: { data, serverRendered: true },
    $graphqlState: { fetchOptions: {} },
    callHook: vi.fn(),
  }
  return state.app
}

/**
 * Call the composable, optionally with the key of the call site that Nuxt's
 * compiler adds as the last argument.
 */
function call(
  options: Record<string, any> = {},
  variables: any = null,
  site?: string,
): Call {
  const args: unknown[] = [
    variables,
    { graphqlCaching: { client: true }, ...options },
  ]
  if (site) {
    args.push(site)
  }
  ;(useAsyncGraphqlQuery as any)('foobar', ...args)
  return state.calls[state.calls.length - 1]!
}

function lookup(c: Call, cause = 'initial') {
  return c.options.getCachedData?.(c.key.value, state.app, { cause })
}

/**
 * Do what useAsyncData does: use the cached data, or perform the request.
 */
async function visit(
  options: Record<string, any> = {},
  variables: any = null,
  site?: string,
) {
  const c = call(options, variables, site)
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
 * Start rendering a page on the server.
 */
function createServerApp() {
  state.server = true
  state.app = { payload: { data: {} }, $graphqlState: { fetchOptions: {} } }
  return state.app
}

/**
 * Render the query on the server, then hydrate the payload in a new app.
 */
async function renderOnServer(
  options: Record<string, any> = {},
  variables: any = null,
  site?: string,
) {
  createServerApp()
  const c = call(options, variables, site)
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
    state.contextCalls = 0
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
    const { key } = await renderOnServer({}, null, '$site')
    const server = state.states[REQUEST_KEYS_STATE]?.value?.[key]
    expect(server?.site).toBe('$site')

    createApp(false)
    await visit({}, null, '$site')
    expect(Object.keys(state.app.$graphqlCache.cache)).toContain(
      server?.request,
    )
  })

  test('records the request on the server during setup', () => {
    // On a prerendered page that gets the data of another page from Nuxt, the
    // handler isn't called.
    createServerApp()
    const c = call({}, null, '$site')
    expect(
      state.states[REQUEST_KEYS_STATE]?.value?.[c.key.value],
    ).toMatchObject({
      request: expect.any(String),
      site: '$site',
    })
  })

  test('records the first call of a key on the server', () => {
    // The first call creates Nuxt's entry, so its handler makes the data.
    createServerApp()
    const c = call({}, null, '$a')
    call({}, null, '$b')
    expect(state.states[REQUEST_KEYS_STATE]?.value?.[c.key.value]?.site).toBe(
      '$a',
    )
  })

  test.each([{ server: false }, { immediate: false }])(
    'does not record a call that does not fetch on the server (%o)',
    (options) => {
      createServerApp()
      const c = call(options)
      expect(
        state.states[REQUEST_KEYS_STATE]?.value?.[c.key.value],
      ).toBeUndefined()
    },
  )

  test('does not record requests on the server if the client cache is disabled in the app config', () => {
    state.appConfig.graphqlMiddleware.clientCacheEnabled = false
    createServerApp()
    const c = call()
    expect(
      state.states[REQUEST_KEYS_STATE]?.value?.[c.key.value],
    ).toBeUndefined()
  })

  test('builds the client context once per call on the server', async () => {
    createServerApp()
    const c = call()
    await c.handler(state.app, {})
    expect(state.contextCalls).toBe(1)
  })

  test('performs the query on the server after the state was cleared', async () => {
    // clearNuxtState() deletes the state that useState() returned.
    createServerApp()
    const c = call()
    state.states[REQUEST_KEYS_STATE]!.value = undefined
    await expect(c.handler(state.app, {})).resolves.toMatchObject({
      data: { time: 1 },
    })
  })

  test('reads the key of the call site that the compiler adds', () => {
    // Without variables and options: useAsyncGraphqlQuery('foobar', '$site')
    ;(useAsyncGraphqlQuery as any)('foobar', '$site')
    expect(state.calls[state.calls.length - 1]!.key.value).toBe(
      `useAsyncGraphqlQuery:foobar:${hash(undefined)}`,
    )

    const c = call({}, { id: '1' }, '$site')
    expect(c.key.value).toBe(`useAsyncGraphqlQuery:foobar:${hash({ id: '1' })}`)
    expect(c.options.getCachedData).toBeTypeOf('function')
  })

  test('returns a response from the payload only to the call site that made it', async () => {
    const { app, data } = await renderOnServer(
      { transform: toTime },
      null,
      '$a',
    )
    await visit({ transform: toTime }, null, '$a')
    app.isHydrating = false

    // A transform with the same source at another call site, for example one
    // that reads other props, or another function that minifies the same.
    expect(await visit({ transform: toTime }, null, '$b')).toMatchObject({
      cached: false,
      data: 2,
    })
    expect(await visit({ transform: toTime }, null, '$a')).toMatchObject({
      cached: true,
      data,
    })
  })

  test('does not cache the payload of another call site during hydration', async () => {
    // Nuxt shares the data of a key between calls, so the call that hydrates
    // first might not be the one that made the data on the server.
    const { app, data } = await renderOnServer(
      { transform: toTime },
      null,
      '$a',
    )
    expect((await visit({ transform: toTime }, null, '$b')).data).toBe(data)
    app.isHydrating = false

    expect((await visit({ transform: toTime }, null, '$b')).cached).toBe(false)
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

  test.each([
    ['the same', toTime, 2],
    ['another', toObject, { time: 2 }],
  ])(
    'does not return the payload after hydration to a call with %s transform',
    async (_label, transform, data) => {
      // For example to a component with delayed hydration, or to a component
      // that is mounted later. The payload might be from a component that
      // never hydrated, with another transform.
      const { app } = await renderOnServer({ transform: toTime })
      app.isHydrating = false

      expect(await visit({ transform })).toMatchObject({ cached: false, data })
    },
  )

  test('returns nothing during hydration for a key that the server did not render', async () => {
    // For example with server: false, or after an error on the server. The
    // request is cached, for example by a plugin.
    createApp(true)
    await useGraphqlQuery('foobar' as any, {} as any, {
      graphqlCaching: { client: true },
    })

    expect(lookup(call({ server: false }))).toBeUndefined()
  })

  test('returns the payload during hydration if the client context can not be built', async () => {
    // For example if buildClientContext() reads a store that a plugin fills
    // once the app is mounted.
    const { data } = await renderOnServer()
    state.contextError = new Error('No context')

    expect(lookup(call())).toBe(data)
  })

  test('returns a cached response during the first render of a page that was not server-rendered', async () => {
    const app = createApp(true)
    app.payload.serverRendered = false
    await useGraphqlQuery('foobar' as any, {} as any, {
      graphqlCaching: { client: true },
    })

    expect(lookup(call())).toMatchObject({ data: { time: 1 } })
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
    const hit = await visit({ pick: ['data'] })
    expect(hit.cached).toBe(true)
    // The response also has errors, which aren't picked.
    expect(hit.data).toEqual({ data: { time: 1 } })
  })

  test.each([
    ['an async transform', async (v: any) => v.data.time],
    ['a transform that returns a promise', (v: any) => Promise.resolve(v)],
  ])('does not return a cached response for %s', async (_label, transform) => {
    await visit({ transform })
    expect(lookup(call({ transform }))).toBeUndefined()
  })

  test('calls a transform that returns a promise once on later cache hits', async () => {
    // For example an arrow function that calls an async helper.
    const transform = vi.fn((v: any) => Promise.resolve(v.data.time))
    await visit({ transform }, null, '$promise')
    expect(transform).toHaveBeenCalledTimes(1)

    // On the first cache hit, the lookup calls it, and Nuxt calls it again.
    await visit({ transform }, null, '$promise')
    expect(transform).toHaveBeenCalledTimes(3)

    // On later cache hits, only Nuxt calls it.
    await visit({ transform }, null, '$promise')
    expect(transform).toHaveBeenCalledTimes(4)
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

      // A later visit gets the new response, not the one from the payload.
      expect(await visit()).toMatchObject({
        cached: true,
        data: { data: { time: 2 } },
      })
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

  test('keeps the responses of other variables on refresh', async () => {
    const variables = ref({ id: '1' })
    const c = call({}, variables)

    // Variables 1, then 2, then 1 again, which is a cache hit.
    expect(lookup(c)).toBeUndefined()
    await c.handler(state.app, {})
    variables.value = { id: '2' }
    expect(lookup(c)).toBeUndefined()
    await c.handler(state.app, {})
    variables.value = { id: '1' }
    expect(lookup(c)).toMatchObject({ data: { time: 1 } })

    expect(lookup(c, 'refresh:manual')).toBeUndefined()
    await c.handler(state.app, {})

    // The response for 2 is still cached.
    variables.value = { id: '2' }
    expect(lookup(c)).toMatchObject({ data: { time: 2 } })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

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

  test('applies the same transform on a cache hit as Nuxt after a request', async () => {
    // Options that are a class instance: the copy that Nuxt gets doesn't have
    // the transform() of the prototype.
    class Options {
      graphqlCaching = { client: true }
      transform(v: any) {
        return v.data.time
      }
    }

    ;(useAsyncGraphqlQuery as any)('foobar', null, new Options())
    const first = state.calls[state.calls.length - 1]!
    expect(first.options.transform).toBeUndefined()
    const response = await first.handler(state.app, {})

    ;(useAsyncGraphqlQuery as any)('foobar', null, new Options())
    expect(lookup(state.calls[state.calls.length - 1]!)).toBe(response)
  })

  test('keeps a getCachedData from the options', async () => {
    const getCachedData = () => 'custom'
    expect(call({ getCachedData }).options.getCachedData).toBe(getCachedData)

    // No request is recorded on the server either.
    const { key } = await renderOnServer({ getCachedData })
    expect(state.states[REQUEST_KEYS_STATE]?.value?.[key]).toBeUndefined()
  })
})
