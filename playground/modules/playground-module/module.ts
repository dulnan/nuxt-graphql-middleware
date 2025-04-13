import { defineNuxtModule } from '@nuxt/kit'
import { useGraphqlModuleContext } from '../../../src/utils'
import { fileURLToPath } from 'url'

const USER_FRAGMENT = `
fragment userFromModule on User {
  description
}
`

const USER_QUERY = `
query queryFromModule {
  users {
    ...userFromModule
  }
}
`

export default defineNuxtModule({
  meta: {
    name: 'nuxt-graphql-middleware-playground',
  },
  setup() {
    const context = useGraphqlModuleContext()

    const queryFromDisk =
      fileURLToPath(new URL('./graphql', import.meta.url)) +
      '/queryFromDisk.graphql'

    // Conditionally add documents based on the schema.
    if (context.schemaHasType('User')) {
      context.addDocument('fragmentFromModule', USER_FRAGMENT)
      context.addDocument('queryFromModule', USER_QUERY)
      context.addImportFile(queryFromDisk)
    }
  },
})
