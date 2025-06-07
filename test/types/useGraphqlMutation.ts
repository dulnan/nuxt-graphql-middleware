import { useGraphqlMutation } from '~/src/runtime/composables/useGraphqlMutation'

useGraphqlMutation('triggerError')

// @ts-expect-error Invalid mutation name.
useGraphqlMutation('invalidMutation')

// @ts-expect-error Missing variables.
useGraphqlMutation('deleteUser')

// @ts-expect-error Wrong variable type.
useGraphqlMutation('deleteUser', { id: '123' })

useGraphqlMutation('deleteUser', { id: 123 })

useGraphqlMutation(
  'deleteUser',
  { id: 123 },
  {
    fetchOptions: {
      params: {
        foobar: 'en',
      },
    },
    clientContext: {
      language: 'en',
    },
  },
)
