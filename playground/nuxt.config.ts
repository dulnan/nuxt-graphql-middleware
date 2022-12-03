import { defineNuxtConfig } from 'nuxt/config'
import { getHeader } from 'h3'
import { GraphqlMiddlewareConfig } from '../src/types'
import graphqlMiddlewareModule from './../src/module'

const graphqlMiddleware: GraphqlMiddlewareConfig = {
  graphqlEndpoint: 'http://localhost:4000',

  serverFetchOptions: function (event) {
    const headers: HeadersInit = {
      'x-nuxt-header-server': 'Value from server',
    }
    if (event) {
      const headerValue = getHeader(event, 'x-nuxt-header-client')
      if (headerValue) {
        headers['x-nuxt-header-client'] = headerValue
      }
    }
    return { headers }
  },

  onServerResponse(event, graphqlResponse) {
    // Set a static header.
    event.node.res.setHeader('x-nuxt-custom-header', 'A custom header value')

    // Pass the set-cookie header from the GraphQL server to the client.
    const setCookie = graphqlResponse.headers.get('set-cookie')
    if (setCookie) {
      event.node.res.setHeader('set-cookie', setCookie)
    }

    // Return the GraphQL response as is.
    return {
      ...graphqlResponse._data,
      __customProperty: ['one', 'two'],
    }
  },
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule],
  graphqlMiddleware,
})
