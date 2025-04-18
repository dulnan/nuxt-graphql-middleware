import { defineGraphqlServerOptions } from './../../src/server-options'

export default defineGraphqlServerOptions({
  serverFetchOptions: function (event, _operation, operationName) {
    const headers: Record<string, any> = {
      'x-nuxt-header-server': 'Value from server',
      authentication: 'server-token',
      'x-apollo-operation-name': operationName,
    }
    return { headers }
  },
})
