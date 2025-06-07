import { useAsyncGraphqlQuery } from '~/src/runtime/composables/useAsyncGraphqlQuery'
import { computed } from 'vue'

useAsyncGraphqlQuery('users')
useAsyncGraphqlQuery('users', null)
useAsyncGraphqlQuery('users', {})
useAsyncGraphqlQuery('users', undefined)

// @ts-expect-error Invalid query name.
useAsyncGraphqlQuery('invalidQuery')

// @ts-expect-error Missing required variables.
useAsyncGraphqlQuery('userById')

useAsyncGraphqlQuery('userById', { id: '1' })

useAsyncGraphqlQuery(
  'userById',
  computed(() => {
    return {
      id: '1',
    }
  }),
)

useAsyncGraphqlQuery(
  'userById',
  // @ts-expect-error Wrong return type in computed.
  computed(() => {
    return {
      ID: 1,
    }
  }),
)

useAsyncGraphqlQuery(
  'userById',
  { id: '1' },
  {
    graphqlCaching: {
      client: true,
    },
  },
)

useAsyncGraphqlQuery(
  'userById',
  { id: '1' },
  {
    fetchOptions: {
      params: {
        language: 'en',
      },
    },
  },
)

export async function returnTypeCorrect() {
  const { data } = await useAsyncGraphqlQuery('userById', { id: '123' })
  console.log(data.value?.data.userById?.firstName)

  // @ts-expect-error Wrong property.
  console.log(data.value?.data.foobar)
}

export function returnTypeCorrectWithoutAwait() {
  const result = useAsyncGraphqlQuery('userById', { id: '123' })
  console.log(result.data.value?.data.userById?.firstName)

  // @ts-expect-error Wrong property.
  console.log(result.data.value?.data.foobar)
}

export async function transformedReturnTypeCorrect() {
  const { data } = await useAsyncGraphqlQuery(
    'userById',
    { id: '123' },
    {
      transform: function (data) {
        return data.data.userById
      },
    },
  )

  console.log(data.value?.firstName)

  // @ts-expect-error It's possibly undefined because no default value.
  console.log(data.value.firstName)

  // @ts-expect-error Wrong property.
  console.log(data.value?.foobar)
}

export async function transformedReturnTypeWithPartialDefault() {
  const { data } = await useAsyncGraphqlQuery(
    'userById',
    { id: '123' },
    {
      transform: function (data) {
        return data.data.userById
      },
      default: function () {
        return {
          firstName: 'John',
        }
      },
    },
  )

  console.log(data.value?.firstName)

  // @ts-expect-error Wrong property, because default value is only partial.
  console.log(data.value?.lastName)
}

export async function transformedReturnTypeWithFullDefault() {
  const { data } = await useAsyncGraphqlQuery('users', null, {
    transform: function (data) {
      return data.data.users
    },
    default: function () {
      return []
    },
  })

  console.log(data.value[0])

  // @ts-expect-error Wrong property, because default value is only partial.
  console.log(data.value?.lastName)
}

export async function onlyDefaultValue() {
  const { data } = await useAsyncGraphqlQuery('users', null, {
    default: function () {
      return {
        data: {
          users: [],
        },
      }
    },
  })

  console.log(data.value.data.users[0].meansOfContact)

  // @ts-expect-error Property does not exist because not returned in default.
  console.log(data.value.errors)

  // @ts-expect-error Wrong property, because default value is only partial.
  console.log(data.value?.lastName)
}
