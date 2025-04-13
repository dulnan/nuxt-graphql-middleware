import { getHeader } from 'h3'
import { defineGraphqlServerOptions } from './../../src/server-options'
import { createError } from '#imports'

type Cacheability = {
  cacheTags: string[]
  maxAge: number
}

// Passing our custom properties on the GraphQL response as a generic.
export default defineGraphqlServerOptions<{ __cacheability?: Cacheability }>({
  graphqlEndpoint(event, operation, operationName) {
    if (operationName === 'simulateEndpointDown') {
      return 'http://invalid/graphql'
    }
  },

  serverFetchOptions: function (event, _operation, operationName, context) {
    const headers: Record<string, any> = {
      'x-nuxt-header-server': 'Value from server',
      authentication: 'server-token',
      'x-apollo-operation-name': operationName,
      'x-nuxt-client-options-language': context?.client?.language,
    }
    if (event) {
      const headerValue = getHeader(event, 'x-nuxt-header-client')
      if (headerValue) {
        headers['x-nuxt-header-client'] = headerValue
      }
      const headerValueFromComposable = getHeader(
        event,
        'x-nuxt-header-client-from-composable',
      )
      if (headerValueFromComposable) {
        headers['x-nuxt-header-client-from-composable'] =
          headerValueFromComposable
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

    if (!graphqlResponse._data?.data) {
      throw createError({ statusCode: 500 })
    }

    // Return the GraphQL response as is.
    return {
      data: graphqlResponse._data.data,
      errors: graphqlResponse._data.errors,
      __cacheability: {
        cacheTags: ['one', 'two'],
        maxAge: 7200,
      },
    }
  },
})
