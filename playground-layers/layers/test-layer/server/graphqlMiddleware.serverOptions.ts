import { defineGraphqlServerOptions } from './../../../../src/server-options'

export default defineGraphqlServerOptions({
  serverFetchOptions: function (_event, _operation, operationName) {
    const headers: Record<string, any> = {
      'x-nuxt-header-server': 'Value from layer',
      authentication: 'server-token',
      'x-apollo-operation-name': operationName,
    }
    return { headers }
  },
})
