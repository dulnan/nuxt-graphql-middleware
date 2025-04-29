# Templates

The module generates several templates in a `nuxt-graphql-middleware` folder in
your build directory (usually `.nuxt`).

## `client-options`

**Alias: `#nuxt-graphql-middleware/client-options`**

### Exports

#### clientOptions

If [client options](/configuration/client-options) are defined this file imports
and re-exports your defined client options.

#### Type: `GraphqlClientContext`

This exports the inferred type of the client context. For example:

::: code-group

```typescript [~/app/graphqlMiddleware.clientOptions.ts]
export default defineGraphqlClientOptions<{
  language: string
  country: string
}>({})
```

:::

The type of `GraphqlClientContext` would be:

```typescript
export type GraphqlClientContext = {
  language: string
  country: string
}
```

## `documents`

**Alias: `#nuxt-graphql-middleware/documents`**

### Exports

#### documents

An object with `query` and `mutation` properties, containing the raw GraphQL
documents for every operation.

```js
const d = String.raw`fragment user on User{id firstName lastName email description dateOfBirth description meansOfContact}`

export const documents = {
  query: {
    foobar: String.raw`query foobar{users{...user}}` + d,
    users: String.raw`query users{users{...user}}` + d,
  },
  mutation: {
    addUser:
      String.raw`mutation addUser($user:UserData!){createUser(user:$user){...user}}` +
      d,
  },
}
```

## `graphql.config`

**Alias not available.**

The [`graphql.config.ts`](https://the-guild.dev/graphql/config/docs/user/usage)
file you can extend from to add GraphQL LSP support in your IDE.

## `helpers`

**Alias: `#nuxt-graphql-middleware/helpers`**

### Exports

#### `serverApiPrefix: string`

Contains the configured prefix of the GraphQL middleware route.

#### `getEndpoint: (operation: string, operationName: string) => string`

A method to build the full path for an operation to the GraphQL middleware.

Example:

```typescript
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'

const path = getEndpoint('query', 'loadUsers')

console.log(path)
// Logs: /api/graphql_middleware/query/loadUsers
```

## `nitro`

**Alias not available.**

Augments `InternalApi` from `nitropack/types` to add the possible API routes.

This is so that when you do `useFetch()`, the possible queries and mutations
appear as completion suggestions in your IDE.

## `operation-types`

**Alias: `#nuxt-graphql-middleware/operation-types`**

Exports types for all operations.

```typescript
import type {
  AddUserMutation,
  AddUserMutationVariables,
  FoobarQuery,
  FoobarQueryVariables,
  UsersQuery,
  UsersQueryVariables,
} from './../graphql-operations'

export type Query = {
  foobar: {
    response: FoobarQuery
    variables: FoobarQueryVariables
    needsVariables: false
  }
  users: {
    response: UsersQuery
    variables: UsersQueryVariables
    needsVariables: false
  }
}

export type Mutation = {
  addUser: {
    response: AddUserMutation
    variables: AddUserMutationVariables
    needsVariables: true
  }
}

export type Operations = {
  query: Query
  mutation: Mutation
}
```

You can use these types to build your own composables that require types about
operations.

For example:

```typescript
import type { Query } from '#nuxt-graphql-middleware/operations'

type ValidQueryName = keyof Query

function isUserQuery(name: ValidQueryName): boolean {
  return name === 'users'
}
```

## `operation-hashes`

**Alias: `#nuxt-graphql-middleware/operation-hashes`**

Exports the unique hash for every operation.

### Exports

#### `operationHashes`

An object of operation names as key and hashes as values. The hash is calculated
from the operation source + all fragments used in the fragment.

## `response`

**Alias: `#nuxt-graphql-middleware/response`**

Exports types about GraphQL response.

### Exports

#### `GraphqlMiddlewareResponseUnion`

A union type of all possible query or mutation responses.

#### `GraphqlResponse<T>`

A type for a response from the GraphQL middleware. Takes a generic for a
specific operation response type. It also includes any
[custom response additions](/examples/graphql-response-extensions).

#### `GraphqlResponseTyped`

A type for any possible GraphQL middleware response. Same as
`GraphqlResponse<GraphqlMiddlewareResponseUnion>`.

## `server-options`

**Alias: `#nuxt-graphql-middleware/server-options`**

If [server options](/configuration/server-options) are defined, contains an
import and re-export of your server options.

### Exports

#### `GraphqlResponseAdditions`

Contains the [custom response additions](/examples/graphql-response-extensions).

For example:

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
export default defineGraphqlServerOptions<{
  extensions: {
    foobar: string
  }
}>({})
```

:::

The exported type would be:

```typescript
export type GraphqlResponseAdditions = {
  foobar: string
}
```

## `sources`

Exports a single object `operationSources` where each property is the name of a
query or mutation operation and the value is the "source file" (relative to the
app root) where the operation was found.

Used internally for the error overlay during development.
