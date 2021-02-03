import { Plugin } from '@nuxt/types'

const IS_DEV = process.env.NODE_ENV === 'development'

function log(action: string, path: string, message: string) {
  if (IS_DEV) {
    // eslint-disable-next-line
    console.log(`[API - ${action}] ${message}: ${path}`)
  }
}

export interface GraphqlMiddlewarePluginConfig {
  cacheInBrowser?: boolean
}

class GraphqlMiddlewarePlugin {
  baseURL: string
  headers: any
  cache?: Map<string, any>

  constructor(
    baseURL: string,
    headers: any,
    options: GraphqlMiddlewarePluginConfig
  ) {
    this.baseURL = baseURL
    this.headers = headers || {}
    if (options.cacheInBrowser) {
      this.cache = new Map()
    }
  }

  query(name: string, variables?: any) {
    const params = new URLSearchParams({
      name,
      variables: JSON.stringify(variables || {}),
    })
    const url = this.baseURL + '/query?' + params.toString()
    if (this.cache?.has(url)) {
      log('query', url, 'Loading from cache')
      return Promise.resolve(this.cache.get(url))
    }
    log('query', url, 'Fetching')
    return fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        throw new Error('Server Error')
      })
      .then((data) => {
        // Only cache on client side.
        // Keep the cache from getting too big.
        if (this.cache && this.cache.size > 30) {
          const key = this.cache.keys().next().value
          this.cache.delete(key)
        }
        this.cache?.set(url, data)
        return data
      })
  }

  mutate(name: string, variables?: any) {
    const params = new URLSearchParams({
      name,
    })
    return fetch(this.baseURL + '/mutate?' + params.toString(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(variables),
    }).then((response) => response.json())
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    $api: GraphqlMiddlewarePlugin
  }
}

declare module '@nuxt/types' {
  interface NuxtAppOptions {
    $graphql: GraphqlMiddlewarePlugin
  }
  interface Context {
    $graphql: GraphqlMiddlewarePlugin
  }
}

const apiPlugin: Plugin = (context, inject) => {
  const namespace = "<%= options.namespace || '' %>"
  // @ts-ignore
  const cacheInBrowser = "<%= options.browserCache || '' %>" === 'true'
  let baseURL = namespace
  if (process.server) {
    baseURL = 'http://0.0.0.0:3000' + namespace
  }
  inject(
    'graphql',
    new GraphqlMiddlewarePlugin(baseURL, context.req?.headers, {
      cacheInBrowser,
    })
  )
}

export default apiPlugin
