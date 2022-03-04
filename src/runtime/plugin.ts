import { defineNuxtPlugin } from '#app'

const IS_DEV = process.env.NODE_ENV === 'development'

function log(action: string, path: string, message: string) {
  if (IS_DEV) {
    // eslint-disable-next-line
    console.log(`[API - ${action}] ${message}: ${path}`)
  }
}

export interface GraphqlMiddlewarePluginConfig {
  enabled?: boolean
  port?: number
  cacheInBrowser?: boolean
  cacheInServer?: boolean
}

export class GraphqlMiddlewarePlugin {
  baseURL: string
  headers: any
  beforeRequestFn: Function | undefined
  cache?: Map<string, any>
  context: any

  constructor(
      baseURL: string,
      headers: any,
      useCache: boolean,
      context: Record<string, any>
  ) {
    this.baseURL = baseURL
    this.headers = headers || {}
    this.context = context
    if (useCache) {
      this.cache = new Map()
    }
  }

  getPluginHeaderValue() {
    return {
      'Nuxt-Graphql-Middleware-Route': this.context?.route?.fullPath || '',
    }
  }

  beforeRequest(fn: Function) {
    this.beforeRequestFn = fn
  }

  clearCache() {
    if (this.cache) {
      this.cache.clear()
    }
  }

  /**
   * Perform a GraphQL query via the middleware.
   */
  query(name: string, variables?: any, headers: any = {}) {
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

    const defaultOptions: any = {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...this.headers,
        ...this.getPluginHeaderValue(),
      },
    }

    // Call the beforeRequest function to get the merged fetch options.
    return this.doBeforeRequest(defaultOptions).then((fetchOptions) => {
      return fetch(url, fetchOptions)
          .then((response) => {
            if (response.ok) {
              return response.json()
            }
            throw new Error('Server Error')
          })
          .then((data) => {
            // Keep the cache from getting too big.
            if (this.cache && this.cache.size > 30) {
              const key = this.cache.keys().next().value
              this.cache.delete(key)
            }
            this.cache?.set(url, data)
            return data
          })
    })
  }

  /**
   * If a beforeRequest function is provided, call it.
   */
  doBeforeRequest(fetchOptions: Record<string, any>) {
    if (!this.beforeRequestFn) {
      return Promise.resolve(fetchOptions)
    }

    return Promise.resolve(this.beforeRequestFn(this.context, fetchOptions))
  }

  /**
   * Perform a GraphQL mutation via the middleware.
   */
  mutate(name: string, variables?: any, headers: any = {}) {
    const params = new URLSearchParams({
      name,
    })
    let fetchOptions: any = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...this.headers,
        ...this.getPluginHeaderValue(),
      },
      body: JSON.stringify(variables),
    }
    if (this.beforeRequestFn) {
      fetchOptions = this.beforeRequestFn(this.context, fetchOptions)
    }
    return fetch(
        this.baseURL + '/mutate?' + params.toString(),
        fetchOptions
    ).then((response) => response.json())
  }
}

export default defineNuxtPlugin((nuxtApp) => {

  const namespace = nuxtApp.$config.graphqlMiddleware.namespace
  const port = process?.env?.NUXT_PORT || nuxtApp.$config.graphqlMiddleware.port
  const cacheInBrowser = nuxtApp.$config.graphqlMiddleware.cacheInBrowser
  const cacheInServer = nuxtApp.$config.graphqlMiddleware.cacheInServer

  let baseURL = namespace
  if (process.server) {
    baseURL = 'http://localhost:' + port + namespace
  }

  const useCache = (process.server && cacheInServer) || (process.client && cacheInBrowser)

  const plugin = new GraphqlMiddlewarePlugin(
      baseURL,
      nuxtApp.ssrContext?.req?.headers,
      useCache,
      nuxtApp.ssrContext
  )

  return {
    provide: {
      graphql: plugin
    }
  }

})
