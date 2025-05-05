import { useGraphqlQuery } from '~/src/runtime/composables/useGraphqlQuery'

useGraphqlQuery('getError')
useGraphqlQuery({ name: 'getError' })

// @ts-expect-error No variables accepted.
useGraphqlQuery('getError', { foobar: 'asdf' })
// @ts-expect-error No variables accepted.
useGraphqlQuery({ name: 'getError', variables: { foobar: 'asdf' } })

// @ts-expect-error Invalid query name.
useGraphqlQuery('invalidQuery')
// @ts-expect-error Invalid query name.
useGraphqlQuery({ name: 'invalidQuery' })

// @ts-expect-error Missing variables.
useGraphqlQuery('userById')

useGraphqlQuery('userById', { id: 1 })
useGraphqlQuery('userById', { id: '1' })

useGraphqlQuery('optionalVariable', {})
useGraphqlQuery('optionalVariable', null)
useGraphqlQuery('optionalVariable', undefined)
useGraphqlQuery('optionalVariable', { value: 12 })
useGraphqlQuery({ name: 'optionalVariable', variables: { value: 12 } })

// @ts-expect-error Wrong variables type.
useGraphqlQuery({ name: 'optionalVariable', variables: { value: '12' } })

// With options as third argument.
useGraphqlQuery(
  'userById',
  { id: '1' },
  {
    graphqlCaching: {
      client: true,
    },
    fetchOptions: {
      params: {
        foobar: '123',
      },
    },
    clientContext: {
      language: 'en',
    },
  },
)

// As a single object.
useGraphqlQuery({
  name: 'userById',
  variables: {
    id: '1',
  },
  graphqlCaching: {
    client: true,
  },
  fetchOptions: {
    params: {
      foobar: '123',
    },
  },
  clientContext: {
    language: 'en',
  },
})

const result = await useGraphqlQuery('users')
console.log(result.data.users)
console.log(result.data.users[0].lastName)
console.log(result.data.users[0].firstName)
console.log(result.errors[0].path)
