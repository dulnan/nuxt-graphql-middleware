import { Context } from '@nuxt/types'

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
    context: Context
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

    let fetchOptions: any = {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...this.headers,
        ...this.getPluginHeaderValue(),
      },
    }

    if (this.beforeRequestFn) {
      fetchOptions = this.beforeRequestFn(this.context, fetchOptions)
    }

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
