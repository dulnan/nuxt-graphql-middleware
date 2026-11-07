import { beforeEach, describe, expect, test, vi } from 'vitest'
import { hash } from 'ohash'
import { useAsyncGraphqlQuery } from './../../../src/runtime/composables/useAsyncGraphqlQuery'

type GetCachedData = (
  key: string,
  app: Record<string, any>,
  ctx: { cause: string },
) => unknown

const state = vi.hoisted(() => {
  return {
    app: {} as Record<string, any>,
    appConfig: {} as Record<string, any>,
    clientCacheEnabledAtBuild: true,
    asyncDataOptions: {} as Record<string, any>,
  }
})

vi.mock('#imports', async () => {
  const { computed } = await import('vue')
  return {
    computed,
    useNuxtApp: () => state.app,
    useAppConfig: () => state.appConfig,
    useAsyncData: (_key: unknown, _handler: unknown, options: any) => {
      state.asyncDataOptions = options
      return {}
    },
  }
})

vi.mock('#nuxt-graphql-middleware/config', () => {
  return {
    get clientCacheEnabledAtBuild() {
      return state.clientCacheEnabledAtBuild
    },
    importMetaClient: true,
    importMetaServer: false,
    experimentalQueryParamEncoding: false,
  }
})

vi.mock('#nuxt-graphql-middleware/client-options', () => {
  return {
    clientOptions: {},
  }
})

vi.mock('./../../../src/runtime/composables/nuxtApp', () => {
  return {
    performRequest: vi.fn(),
  }
})

const KEY = `useAsyncGraphqlQuery:foobar:${hash(null)}`

function createApp(isHydrating: boolean, data: Record<string, unknown> = {}) {
  state.app = { isHydrating, payload: { data } }
  return state.app
}

function setup(options: Record<string, any> = {}) {
  useAsyncGraphqlQuery(
    'foobar' as any,
    null as any,
    {
      graphqlCaching: { client: true },
      ...options,
    } as any,
  )
  return state.asyncDataOptions.getCachedData as GetCachedData | undefined
}

describe('useAsyncGraphqlQuery with graphqlCaching.client', () => {
  beforeEach(() => {
    state.clientCacheEnabledAtBuild = true
    state.appConfig = {
      graphqlMiddleware: {
        clientCacheEnabled: true,
        clientCacheMaxSize: 100,
      },
    }
    state.asyncDataOptions = {}
  })

  test('does not set getCachedData if the client cache is disabled in the module options', () => {
    state.clientCacheEnabledAtBuild = false
    createApp(true, { [KEY]: 'ssr' })
    expect(setup()).toBeUndefined()
  })

  test('does not set getCachedData if the client cache is disabled in the app config', () => {
    state.appConfig.graphqlMiddleware.clientCacheEnabled = false
    createApp(true, { [KEY]: 'ssr' })
    expect(setup()).toBeUndefined()
  })

  test('returns the payload during hydration and stores it in the cache', () => {
    const app = createApp(true, { [KEY]: 'ssr' })
    const getCachedData = setup()!
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBe('ssr')
    expect(app.$graphqlCache.get(KEY)).toBe('ssr')
  })

  test('returns the stored response of the payload on later lookups', () => {
    const app = createApp(true, { [KEY]: 'ssr' })
    const getCachedData = setup()!
    getCachedData(KEY, app, { cause: 'initial' })

    app.isHydrating = false
    // The response can't come from the payload anymore.
    app.payload.data = {}
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBe('ssr')
  })

  test('returns the payload for the first lookup after hydration', () => {
    // For example for a component with delayed hydration.
    const app = createApp(false, { [KEY]: 'ssr' })
    const getCachedData = setup()!
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBe('ssr')

    // The response can't come from the payload anymore.
    app.payload.data = {}
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBe('ssr')
  })

  test('does not return the payload on later lookups', () => {
    const app = createApp(false)
    const getCachedData = setup()!
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBeUndefined()

    // Nuxt stores the response of the request in the payload.
    app.payload.data[KEY] = 'fetched'
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBeUndefined()
  })

  test('does not return the payload after the cache is purged', () => {
    const app = createApp(true, { [KEY]: 'ssr' })
    const getCachedData = setup()!
    getCachedData(KEY, app, { cause: 'initial' })

    app.isHydrating = false
    app.$graphqlCache.purge()
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBeUndefined()
  })

  test('does not return cached data if the client cache was disabled after the setup', () => {
    const app = createApp(true, { [KEY]: 'ssr' })
    const getCachedData = setup()!
    getCachedData(KEY, app, { cause: 'initial' })

    app.isHydrating = false
    state.appConfig.graphqlMiddleware.clientCacheEnabled = false
    expect(getCachedData(KEY, app, { cause: 'initial' })).toBeUndefined()
  })

  test.each(['refresh:manual', 'refresh:hook'])(
    'removes the cached responses of the key on %s',
    (cause) => {
      const app = createApp(true, { [KEY]: 'ssr' })
      const getCachedData = setup()!
      getCachedData(KEY, app, { cause: 'initial' })
      app.$graphqlCache.set('query:foobar:abc', 'response', KEY)

      app.isHydrating = false
      expect(getCachedData(KEY, app, { cause })).toBeUndefined()
      expect(app.$graphqlCache.get(KEY)).toBeUndefined()
      expect(app.$graphqlCache.get('query:foobar:abc')).toBeUndefined()
      expect(getCachedData(KEY, app, { cause: 'initial' })).toBeUndefined()
    },
  )

  test('keeps a getCachedData from the options', () => {
    createApp(true, { [KEY]: 'ssr' })
    const getCachedData = () => 'custom'
    expect(setup({ getCachedData })).toBe(getCachedData)
  })
})
