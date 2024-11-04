import { defineGraphqlClientOptions } from './../../src/runtime/clientOptions/index'
import { useCurrentLanguage } from '#imports'

export default defineGraphqlClientOptions({
  getContext() {
    const language = useCurrentLanguage()

    return {
      language: language.value,
    }
  },
})
