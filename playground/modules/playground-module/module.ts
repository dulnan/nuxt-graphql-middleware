import { defineNuxtModule } from '@nuxt/kit'
import { useGraphqlModuleContext } from '../../../src/module'

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

    // Conditionally add documents based on the schema.
    if (context.schemaHasType('User')) {
      context.addDocument('fragmentFromModule', USER_FRAGMENT)
      context.addDocument('queryFromModule', USER_QUERY)
    }

    if (context.schemaHasType('NonExistingType')) {
      throw new Error('Type should not exist!')
    }
  },
})
