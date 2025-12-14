# useAsyncGraphqlQuery

This composable is a wrapper around Nuxt's
[useAsyncData](https://nuxt.com/docs/api/composables/use-async-data) that
executes a GraphQL query via the middleware. It provides SSR-compatible,
reactive data fetching with automatic refetching when variables change.

## Basic Usage

```typescript
const { data } = await useAsyncGraphqlQuery('users')
```

This is equivalent to:

```typescript
const { data } = await useAsyncData(() => useGraphqlQuery('users'))
```

## With Variables

Pass variables as the second argument:

```typescript
const { data } = await useAsyncGraphqlQuery('filmById', { id: '123' })
```

## Reactive Variables

When variables are wrapped in a `computed` ref, the query automatically
refetches when variables change:

```typescript
import type { UserByIdQueryVariables } from '#graphql-operations'

const route = useRoute()

const variables = computed<UserByIdQueryVariables>(() => {
  return {
    id: route.params.id.toString(),
  }
})

const { data } = await useAsyncGraphqlQuery('userById', variables)
```

The composable automatically adds reactive variables to the `watch` option of
`useAsyncData`, triggering a refetch whenever the variables change.

## Options

The third argument accepts options that extend
[AsyncDataOptions](https://nuxt.com/docs/api/composables/use-async-data#params)
with additional GraphQL-specific settings:

```typescript
const { data } = await useAsyncGraphqlQuery('users', null, {
  // All useAsyncData options are supported
  transform: (response) => response.data.users,
  default: () => [],
  immediate: true,
  server: true,

  // GraphQL-specific options
  graphqlCaching: { client: true },
  fetchOptions: { headers: { 'x-custom': 'value' } },
  clientContext: { language: 'en' },
})
```

### transform

Transform the response before storing it in `data`. This is useful to extract
nested data or modify the response structure:

```typescript
const { data: users } = await useAsyncGraphqlQuery('users', null, {
  transform: (response) => {
    // response.data is UsersQuery
    return response.data.users
  },
})

// users.value is now the users array directly
```

### graphqlCaching

Enable client-side caching for this query. Requires `clientCache.enabled: true`
in module options. See [Caching](/features/caching) for more details.

```typescript
const { data } = await useAsyncGraphqlQuery('users', null, {
  graphqlCaching: {
    client: true,
  },
})
```

When enabled:

- Results are cached in memory using an LRU cache
- Subsequent calls with the same variables return cached data
- Cache survives client-side navigation
- SSR payload data is preserved during hydration

### fetchOptions

Pass options to the underlying `$fetch` call to the middleware endpoint:

```typescript
const { data } = await useAsyncGraphqlQuery('users', null, {
  fetchOptions: {
    headers: {
      authorization: `Bearer ${token}`,
    },
    timeout: 5000,
  },
})
```

### clientContext

Override or extend the global client context for this specific request. Values
here take precedence over those defined in
[defineGraphqlClientOptions](/configuration/client-options):

```typescript
const { data } = await useAsyncGraphqlQuery('users', null, {
  clientContext: {
    language: 'de', // Override the global language for this request
  },
})
```

## Return Value

Returns the same object as
[useAsyncData](https://nuxt.com/docs/api/composables/use-async-data#return-values):

```typescript
const {
  data,     // Ref<T | undefined> - The response data
  pending,  // Ref<boolean> - Loading state
  error,    // Ref<Error | undefined> - Error if request failed
  status,   // Ref<'idle' | 'pending' | 'success' | 'error'>
  refresh,  // () => Promise<void> - Manually refetch data
  execute,  // () => Promise<void> - Same as refresh
  clear,    // () => void - Clear data and error
} = await useAsyncGraphqlQuery('users')
```

## Type Safety

The composable is fully typed based on your GraphQL operations:

```typescript
// Variables are type-checked
const { data } = await useAsyncGraphqlQuery('userById', {
  id: '123', // ✅ Correct type
  // id: 123  // ❌ Type error: expected string
})

// Response data is typed
if (data.value) {
  console.log(data.value.data.userById?.name) // ✅ Autocomplete works
}
```

Operations that require variables will show a type error if variables are
omitted:

```typescript
// ❌ Type error: variables required
const { data } = await useAsyncGraphqlQuery('userById')

// ✅ Correct
const { data } = await useAsyncGraphqlQuery('userById', { id: '123' })
```

## Hot Module Reloading

During development, the composable automatically refetches data when the
underlying GraphQL document or any used fragments change. This provides instant
feedback when modifying queries.

## Important Considerations

### Execution Context

Like `useAsyncData`, this composable must be called in specific contexts:

- **Component setup function** - At the root level, not inside callbacks
- **Plugin setup** - During plugin initialization
- **Route middleware** - During navigation
- **Other composables** - When called from a composable that follows these rules

```typescript
// ✅ Correct - at root of setup
const { data } = await useAsyncGraphqlQuery('users')

// ❌ Wrong - inside a callback
const onClick = async () => {
  // This won't work correctly with SSR
  const { data } = await useAsyncGraphqlQuery('users')
}
```

For fetching data inside event handlers or callbacks, use
[useGraphqlQuery](/composables/useGraphqlQuery) instead.

### Unique Keys

The composable automatically generates a unique key for `useAsyncData` based on:

- The operation name
- A hash of the variables

This ensures that different variable combinations are cached separately and
multiple instances don't conflict.

## Examples

### Pagination

```typescript
import type { UsersPaginatedQueryVariables } from '#graphql-operations'

const page = ref(1)
const limit = 10

const variables = computed<UsersPaginatedQueryVariables>(() => ({
  offset: (page.value - 1) * limit,
  limit,
}))

const { data, pending } = await useAsyncGraphqlQuery(
  'usersPaginated',
  variables,
  {
    transform: (response) => response.data.users,
  },
)

function nextPage() {
  page.value++
  // Query automatically refetches due to reactive variables
}
```

### Conditional Fetching

```typescript
const userId = ref<string | null>(null)

const variables = computed(() =>
  userId.value ? { id: userId.value } : null,
)

const { data } = await useAsyncGraphqlQuery('userById', variables, {
  // Don't fetch until we have a userId
  immediate: false,
})

// Later, when userId is set:
userId.value = '123'
// The query will now execute
```

### Error Handling

```typescript
const { data, error, refresh } = await useAsyncGraphqlQuery('users')

// Check for errors
if (error.value) {
  console.error('Query failed:', error.value.message)
}

// Retry on error
async function retry() {
  await refresh()
}
```

### With Default Value

```typescript
interface User {
  id: string
  name: string
}

const { data } = await useAsyncGraphqlQuery('users', null, {
  transform: (response) => response.data.users ?? [],
  default: () => [] as User[],
})

// data.value is never undefined, defaults to empty array
```

## Comparison with useGraphqlQuery

| Feature | useAsyncGraphqlQuery | useGraphqlQuery |
| --- | --- | --- |
| SSR Support | ✅ Built-in | ✅ When wrapped in useAsyncData |
| Reactive Variables | ✅ Automatic refetch | ❌ Manual handling required |
| Returns | AsyncData object | Promise with response |
| Use in Callbacks | ❌ Not recommended | ✅ Works anywhere |
| Caching | ✅ With useAsyncData | ✅ With graphqlCaching option |
| HMR Refresh | ✅ Automatic | ❌ Manual |

Choose `useAsyncGraphqlQuery` for page-level data fetching with SSR support.
Choose `useGraphqlQuery` for imperative fetching in event handlers, plugins, or
when you need more control.
