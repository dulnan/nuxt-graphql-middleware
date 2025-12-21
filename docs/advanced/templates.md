# Templates

The module generates several templates in a `nuxt-graphql-middleware` folder in
your build directory (usually `.nuxt`).

## `config`

**Alias: `#nuxt-graphql-middleware/config`**

Static module configuration values determined at build time.

### Exports

#### `experimentalQueryParamEncoding: boolean`

Whether the experimental query param encoding is enabled.

#### `clientCacheEnabledAtBuild: boolean`

Whether the client cache was enabled at build time.

#### `importMetaServer: boolean`

Equivalent to `import.meta.server`.

#### `importMetaClient: boolean`

Equivalent to `import.meta.client`.

---

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

## `graphql-operations`

**Alias: `#graphql-operations`**

Contains the generated TypeScript types for all GraphQL operations, including
response types, variable types, enums, and input types.

This is the main output from the `graphql-typescript-deluxe` code generator.

### Exports

All generated types from your GraphQL schema and operations, for example:

```typescript
import type {
  UsersQuery,
  UsersQueryVariables,
  AddUserMutation,
  AddUserMutationVariables,
  MeansOfContact, // enum
  UserData, // input type
} from '#graphql-operations'
```

---

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

---

## `hook-documents`

**Alias not available.**

A generated `.graphql` file containing all GraphQL documents that were added via
the `nuxt-graphql-middleware:init` hook using `addDocument()`.

This file is useful for GraphQL LSP support in your IDE, as it includes
documents that are not in regular `.graphql` files.

The file is generated at `nuxt-graphql-middleware/hook-documents.graphql`.

---

## `hook-files`

**Alias: `#nuxt-graphql-middleware/hook-files`**

Contains an array of file paths that were added via the
`nuxt-graphql-middleware:init` hook using `addFile()`.

### Exports

#### `hookFiles: string[]`

An array of relative file paths added via hooks.

```js
export const hookFiles = ['./node_modules/some-lib/queries.graphql']
```

---

## `mcp`

**Alias: `#nuxt-graphql-middleware/mcp`**

Configuration for the MCP (Model Context Protocol) integration. Only populated
when MCP is enabled.

### Exports

#### `mcpServerRoute: string`

The configured route for the MCP server.

#### `devServerUrl: string`

The dev server URL (only available in dev mode).

#### `docs: Doc[]`

An array of documentation entries for MCP resources (only populated in dev
mode).

```typescript
type Doc = {
  uri: string
  name: string
  description: string
  content: string
}
```

---

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

## `operation-variables`

**Alias: `#nuxt-graphql-middleware/operation-variables`**

Exports an object with operation names as properties and variable names as
values.

### Exports

#### `operationVariables`

```js
export const operationVariables = {
  initState: [],
  testClientOptions: ['path'],
  deleteUser: ['id'],
  createUser: ['name', 'age'],
}
```

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
