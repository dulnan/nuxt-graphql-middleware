import { defineGraphqlClientOptions } from './../../src/client-options'
import { useCurrentLanguage } from '#imports'

export default defineGraphqlClientOptions<{
  language: string
  wsToken?: string
}>({
  buildClientContext(operation) {
    const language = useCurrentLanguage()
    if (operation === 'subscription') {
      return {
        language: language.value,
        wsToken: 'client-options-websocket-token',
        // wsToken: 'client-options-websocket-token-foobar',
      }
    }

    return {
      language: language.value,
    }
  },
})
