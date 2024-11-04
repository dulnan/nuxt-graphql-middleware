import { defineGraphqlClientOptions } from './../../src/runtime/clientOptions/index'
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
