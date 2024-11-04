import { defineGraphqlClientOptions } from './../../src/runtime/clientOptions/index'
import { useCurrentLanguage } from '#imports'

export default defineGraphqlClientOptions<{
  language: string
}>({
  getContext() {
    const language = useCurrentLanguage()

    return {
      language: language.value,
    }
  },
})
