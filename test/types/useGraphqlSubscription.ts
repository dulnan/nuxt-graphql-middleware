import { computed } from 'vue'
import { useGraphqlSubscription } from '~/src/runtime/composables/useGraphqlSubscription'

// @ts-expect-error Missing variables.
useGraphqlSubscription('messageAddedWithFilter')

useGraphqlSubscription(
  'messageAddedWithFilter',
  { type: 'warning' },
  (data) => {
    console.log(data.data.messageAddedWithFilter.user?.lastName)
  },
)

// @ts-expect-error No variables accepted.
useGraphqlSubscription('messageAdded', { foobar: 'asdf' })

useGraphqlSubscription('messageAdded')
useGraphqlSubscription('messageAdded', (data) => {
  console.log(data.data.messageAdded.user?.lastName)
})

useGraphqlSubscription('messageAdded', null, (data) => {
  console.log(data.data.messageAdded.user?.lastName)
})

useGraphqlSubscription('messageAdded', null, {
  callback: (data) => {
    console.log(data.data.messageAdded.user?.lastName)
  },
})

useGraphqlSubscription('messageAddedWithFilterOptional', (data) => {
  console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
})

useGraphqlSubscription(
  'messageAddedWithFilterOptional',
  { type: 'warning' },
  (data) => {
    console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
  },
)

useGraphqlSubscription(
  'messageAddedWithFilterOptional',
  { type: 'warning' },
  {
    callback: (data) => {
      console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
    },
  },
)

useGraphqlSubscription(
  'messageAddedWithFilterOptional',
  { type: 'warning' },
  {
    callback: (data) => {
      console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
    },
    immediate: true,
    clientContext: {
      language: 'en',
    },
  },
)

useGraphqlSubscription(
  'messageAddedWithFilterOptional',
  { type: 'warning' },
  {
    callback: (data) => {
      console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
    },
    immediate: true,
    clientContext: computed(() => {
      return {
        language: 'en',
      }
    }),
  },
)

// @ts-expect-error wrong enum value.
useGraphqlSubscription(
  'messageAddedWithFilterOptional',
  { type: 'warningasdf' },
  (data) => {
    // @ts-expect-error Type can not be inferred.
    console.log(data.data.messageAddedWithFilterOptional.user?.lastName)
  },
)
