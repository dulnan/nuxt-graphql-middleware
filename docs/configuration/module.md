# Module Options

## autoImportPatterns?

> `optional` **autoImportPatterns?**: `string`[]

Defined in:
[options.ts:25](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L25)

File glob patterns for the auto import feature.

If left empty, no documents are auto imported.

### Default

```json
["**/.{gql,graphql}", "!node_modules"]
```

### Example

```ts
// Load .graphql files from pages folder and from a node_modules dependency.
const autoImportPatterns = [
  './pages/**/*.graphql',
  'node_modules/my_library/dist/**/*.graphql',
]
```

---

## bodySizeLimit?

> `optional` **bodySizeLimit?**: `object`

Defined in:
[options.ts:97](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L97)

The maximum size of request bodies in bytes.

Larger requests are refused with a 413 status code. Set a limit to `false` or
`0` to disable it, for example if the web server already limits the size.

The limits can be changed at runtime with the
`NUXT_GRAPHQL_MIDDLEWARE_BODY_SIZE_LIMIT_MUTATION` and
`NUXT_GRAPHQL_MIDDLEWARE_BODY_SIZE_LIMIT_UPLOAD` environment variables.

### mutation?

> `optional` **mutation?**: `number` \| `false`

The limit for mutations.

##### Default

```ts
10485760 (10 MB)
```

### upload?

> `optional` **upload?**: `number` \| `false`

The limit for file uploads, including all files of a request.

##### Default

```ts
52428800 (50 MB)
```

---

## clientCache?

> `optional` **clientCache?**: `object`

Defined in:
[options.ts:239](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L239)

Client caching configuration.

### enabled?

> `optional` **enabled?**: `boolean`

Whether client caching should be enabled.

Note that if you set this to false during build, the cache will not be available
at all. If you intend to enable/disable it using app config at runtime, it
_must_ be enabled at build!

##### Default

```ts
false
```

### maxSize?

> `optional` **maxSize?**: `number`

The maximum number of cache entries.

##### Default

```ts
100
```

---

## codegenConfig?

> `optional` **codegenConfig?**: `GeneratorOptions`

Defined in:
[options.ts:196](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L196)

Options for graphql-typescript-deluxe code generator.

### See

[GeneratorOptions](https://github.com/dulnan/graphql-typescript-deluxe/blob/main/src/types/options.ts#L193)

---

## codegenSchemaConfig?

> `optional` **codegenSchemaConfig?**: `object`

Defined in:
[options.ts:201](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L201)

Configuration for graphql-codegen when downloading the schema.

### schemaAstConfig?

> `optional` **schemaAstConfig?**: `SchemaASTConfig`

Configure how the schema.graphql file should be generated.

##### See

[SchemaASTConfig](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/other/schema-ast/src/index.ts#L23)

### urlSchemaOptions?

> `optional` **urlSchemaOptions?**: `UrlSchemaOptions`

Configure how the schema-ast introspection request should be made.

Usually this is where you can provide a custom authentication header:

```typescript
const codegenSchemaConfig = {
  urlSchemaOptions: {
    headers: {
      authentication: 'foobar',
    },
  },
}
```

##### See

[Types.UrlSchemaOptions](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/utils/plugins-helpers/src/types.ts#L82)

---

## debug?

> `optional` **debug?**: `boolean`

Defined in:
[options.ts:133](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L133)

Enable detailled debugging messages.

### Default

```ts
false
```

---

## devtools?

> `optional` **devtools?**: `boolean`

Defined in:
[options.ts:234](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L234)

Enable Nuxt DevTools integration.

### Default

```ts
true
```

---

## documents?

> `optional` **documents?**: `string`[]

Defined in:
[options.ts:56](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L56)

Additional raw documents to include.

Useful if for example you need to generate queries during build time.

### Default

```ts
;[]
```

### Example

```ts
const documents = [
  `
  query myQuery {
    articles {
      title
      id
    }
  }`,
  ...getGeneratedDocuments(),
]
```

---

## downloadSchema?

> `optional` **downloadSchema?**: `boolean` \| `"dev-only"`

Defined in:
[options.ts:162](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L162)

Whether to download the GraphQL schema and store it on disk.

- `false` The GraphQL schema must exist on disk for the module to work.
- `true` The GraphQL schema will be downloaded and stored on disk.
- `'dev-only'` When running `npm run dev` the schema is downloaded, otherwise it
  is read from disk.

### Default

```ts
true
```

---

## enableFileUploads?

> `optional` **enableFileUploads?**: `boolean`

Defined in:
[options.ts:75](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L75)

Enable support for uploading files via GraphQL.

When enabled, an additional `useGraphqlUploadMutation` composable is included,
in addition to a new server endpoint that handles multi part file uploads for
GraphQL mutations.

---

## errorOverlay?

> `optional` **errorOverlay?**: `boolean`

Defined in:
[options.ts:138](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L138)

Displays GraphQL response errors in an overlay in dev mode.

---

## experimental?

> `optional` **experimental?**: `object`

Defined in:
[options.ts:262](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L262)

Experimental features.

### improvedQueryParamEncoding?

> `optional` **improvedQueryParamEncoding?**: `boolean`

Enables improved encoding for GraphQL query param encoding.

If enabled, query variables that are non-strings such as numbers or booleans are
encoded as strings, with a prefix in their name to indicate the type.

For example, given this object definining query variables:

```
{
  name: 'John',
  age: 35,
  isUser: false
}
```

This would be encoded as:

```
name=John&n:age=35&b:isUser=false
```

This only works for flat primitive values. Nested objects or arrays are still
encoded using the __variables fallback where all variables are JSON encoded.

---

## fileUploadScalar?

> `optional` **fileUploadScalar?**: `string`

Defined in:
[options.ts:85](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L85)

The name of the GraphQL scalar used for file uploads.

Only mutations with a variable of this type, directly or in an input type, can
be performed via the upload server endpoint.

### Default

```ts
'Upload'
```

---

## graphqlConfigFilePath?

> `optional` **graphqlConfigFilePath?**: `string`

Defined in:
[options.ts:34](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L34)

The path where your graphql.config.ts is, relative to the location of
nuxt.config.ts.

Used to generate the correct paths in the graphql.config.ts file generated by
the module.

### Default

```ts
'./graphql.config.ts'
```

---

## graphqlEndpoint?

> `optional` **graphqlEndpoint?**: `string`

Defined in:
[options.ts:150](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L150)

The URL of the GraphQL server.

If not provided, the module will use the
NUXT_GRAPHQL_MIDDLEWARE_GRAPHQL_ENDPOINT environment variable during dev mode.

For the runtime execution you can provide a method that determines the endpoint
during runtime. See the server/graphqlMiddleware.serverOptions.ts documentation
for more information.

---

## graphqlServerTimeout?

> `optional` **graphqlServerTimeout?**: `number` \| `false`

Defined in:
[options.ts:126](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L126)

The timeout for requests to the GraphQL server in milliseconds.

Requests that take longer, including reading the response, are aborted and
answered with a 504 status code. Set to `false` or `0` to disable it.

A `timeout` or `signal` returned by the `serverFetchOptions` method of the
server options takes precedence, which allows a different timeout for single
operations. The timeout can be changed at runtime with the
`NUXT_GRAPHQL_MIDDLEWARE_GRAPHQL_SERVER_TIMEOUT` environment variable.

### Default

```ts
30000
```

---

## includeComposables?

> `optional` **includeComposables?**: `boolean`

Defined in:
[options.ts:66](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L66)

Wether the useGraphqlQuery, useGraphqlMutation and useGraphqlState composables
should be included.

### Default

```ts
true
```

---

## logOnlyErrors?

> `optional` **logOnlyErrors?**: `boolean`

Defined in:
[options.ts:189](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L189)

Logs only errors.

When enabled only errors are logged to the console when generating the GraphQL
operations. If false, all operations are logged, including valid ones.

---

## mcp?

> `optional` **mcp?**: `object`

Defined in:
[options.ts:296](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L296)

Configuration for the @nuxtjs/mcp-toolkit integration.

### enabled

> **enabled**: `boolean`

Whether the MCP integration should be enabled.

### route?

> `optional` **route?**: `string`

The route of the MCP server.

##### Default

```ts
;/mcp/ntux - graphql - middleware
```

---

## schemaPath?

> `optional` **schemaPath?**: `string`

Defined in:
[options.ts:172](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L172)

Path to the GraphQL schema file.

If `downloadSchema` is `true`, the downloaded schema is written to this
specified path. If `downloadSchema` is `false`, this file must be present in
order to generate types.

### Default

```ts
'./schema.graphql'
```

---

## serverApiPrefix?

> `optional` **serverApiPrefix?**: `string`

Defined in:
[options.ts:181](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L181)

The prefix for the server route.

### Default

```ts
'/api/graphql_middleware'
```
