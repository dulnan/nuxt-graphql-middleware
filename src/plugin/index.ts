import Vue from 'vue'
import { Plugin } from '@nuxt/types'

const IS_DEV = process.env.NODE_ENV === 'development'

function log(action: string, path: string, message: string) {
  if (IS_DEV) {
    // eslint-disable-next-line
    console.log(`[API - ${action}] ${message}: ${path}`)
  }
}

export interface GraphqlMiddlewarePluginConfig {
  enabled?: boolean
  cacheInBrowser?: boolean
  cacheInServer?: boolean
}

export class GraphqlMiddlewarePlugin {
  baseURL: string
  headers: any
  cache?: Map<string, any>

  constructor(baseURL: string, headers: any, useCache: boolean) {
    this.baseURL = baseURL
    this.headers = headers || {}
    if (useCache) {
      this.cache = new Map()
    }
  }

  /**
   * Perform a GraphQL query via the middleware.
   */
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

const graphqlMiddlewarePlugin: Plugin = (context, inject) => {
  const namespace = "<%= options.namespace || '' %>"
  const port = '<%= options.port %>'
  // @ts-ignore
  const cacheInBrowser = "<%= options.cacheInBrowser || '' %>" === 'true'
  // @ts-ignore
  const cacheInServer = "<%= options.cacheInServer || '' %>" === 'true'

  let baseURL = namespace
  if (process.server) {
    baseURL = 'http://0.0.0.0:' + port + namespace
  }

  const useCache =
    (process.server && cacheInServer) || (process.client && cacheInBrowser)
  inject(
    'graphql',
    new GraphqlMiddlewarePlugin(baseURL, context.req?.headers, useCache)
  )
}

export default graphqlMiddlewarePlugin
