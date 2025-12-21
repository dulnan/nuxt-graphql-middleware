# doGraphqlRequest()

This util provides low-level access to execute arbitrary GraphQL queries and
mutations in a server (nitro) context. Unlike `useGraphqlQuery` and
`useGraphqlMutation`, this function accepts a raw GraphQL query string instead
of a pre-defined operation name.

This is useful when you need to:

- Execute dynamically constructed GraphQL queries
- Run queries that aren't part of your pre-defined operations
- Have full control over the GraphQL request body

## Function Signature

```typescript
function doGraphqlRequest(
  body: RequestBody,
  context?: GraphqlMiddlewareRequestContext | null,
  event?: H3Event | null,
): Promise<GraphqlResponse>
```

### Parameters

| Parameter | Type                              | Description                                                                               |
| --------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| body      | `RequestBody`                     | The GraphQL request body containing the query, variables, and optional operation name     |
| context   | `GraphqlMiddlewareRequestContext` | Optional client context to pass to server options methods                                 |
| event     | `H3Event`                         | Optional H3 event. If not provided, the util will try to get the event using `useEvent()` |

### RequestBody

```typescript
type RequestBody = {
  query: string
  variables?: Record<string, any>
  operationName?: string
}
```

## Example

```typescript
export default defineEventHandler(async () => {
  const result = await doGraphqlRequest({
    query: `
      query GetUsers {
        users {
          id
          name
          email
        }
      }
    `,
  })

  return result.data.users
})
```

## With Variables

```typescript
export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)

  const result = await doGraphqlRequest({
    query: `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `,
    variables: { id },
    operationName: 'GetUser',
  })

  return result.data.user
})
```

## With Client Context

You can pass client context that will be available in your
[server options](/configuration/server-options) methods:

```typescript
export default defineEventHandler(async () => {
  const result = await doGraphqlRequest(
    {
      query: `
        query GetLocalizedContent {
          content {
            title
            body
          }
        }
      `,
    },
    {
      language: 'de',
      country: 'DE',
    },
  )

  return result.data.content
})
```

## Server Options Integration

This util respects all configured
[server options](/configuration/server-options):

- If `doGraphqlRequest` is defined in server options, it will be called instead
  of the default implementation
- `graphqlEndpoint()` is used to determine the GraphQL server URL
- `serverFetchOptions()` is used to get fetch options (headers, etc.)
- `onServerResponse()` is called after a successful response
- `onServerError()` is called when an error occurs

## When to Use

Use `doGraphqlRequest` when:

- You need to execute a GraphQL query that isn't pre-defined in your `.graphql`
  files
- You're building dynamic queries at runtime
- You need direct control over the GraphQL request

For most use cases, prefer `useGraphqlQuery` and `useGraphqlMutation` as they
provide full type safety based on your defined operations.
