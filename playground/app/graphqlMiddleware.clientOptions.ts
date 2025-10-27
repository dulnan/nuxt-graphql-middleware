import { defineGraphqlClientOptions } from './../../src/client-options'
import { useCurrentLanguage, useRoute } from '#imports'

export default defineGraphqlClientOptions<{
  language: string
}>({
  buildClientContext() {
    const language = useCurrentLanguage()
    const route = useRoute()

    return {
      language: language.value,
      routePath: route.path,
    }
  },
})
