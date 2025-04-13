import { defineGraphqlClientOptions } from './../../src/client-options'
import { useCurrentLanguage } from '#imports'

export default defineGraphqlClientOptions<{
  language: string
}>({
  buildClientContext() {
    const language = useCurrentLanguage()

    return {
      language: language.value,
    }
  },
})
