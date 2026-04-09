import { defineGraphqlClientOptions } from './../../../../src/client-options'

export default defineGraphqlClientOptions({
  buildClientContext() {
    return {
      fromLayer: 'true',
    }
  },
})
