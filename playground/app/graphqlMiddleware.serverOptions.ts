import { getHeader } from 'h3'
import { defineGraphqlServerOptions } from './../../src/runtime/serverOptions/index'

export default defineGraphqlServerOptions<{
  __customProperty?: string[]
}>({
  graphqlEndpoint(event, operation, operationName) {
    if (operationName === 'simulateEndpointDown') {
      return 'http://invalid/graphql'
    }
  },

  serverFetchOptions: function (event) {
    const headers: HeadersInit = {
      'x-nuxt-header-server': 'Value from server',
      authentication: 'server-token',
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
      data: graphqlResponse._data?.data || null,
      errors: graphqlResponse._data?.errors || [],
      __customProperty: ['one', 'two'],
    }
  },
})
