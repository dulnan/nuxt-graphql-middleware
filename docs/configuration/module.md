# Module Options

## autoImportPatterns?

> `optional` **autoImportPatterns**: `string`[]

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

## clientCache?

> `optional` **clientCache**: `object`

Defined in:
[options.ts:185](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L185)

Client caching configuration.

### enabled?

> `optional` **enabled**: `boolean`

Whether client caching should be enabled.

Note that if you set this to false during build, the cache will not be available
at all. If you intend to enable/disable it using app config at runtime, it
_must_ be enabled at build!

##### Default

```ts
false
```

### maxSize?

> `optional` **maxSize**: `number`

The maximum number of cache entries.

##### Default

```ts
100
```

---

## codegenConfig?

> `optional` **codegenConfig**: `GeneratorOptions`

Defined in:
[options.ts:142](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L142)

Options for graphql-typescript-deluxe code generator.

### See

[GeneratorOptions](https://github.com/dulnan/graphql-typescript-deluxe/blob/main/src/types/options.ts#L193)

---

## codegenSchemaConfig?

> `optional` **codegenSchemaConfig**: `object`

Defined in:
[options.ts:147](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L147)

Configuration for graphql-codegen when downloading the schema.

### schemaAstConfig?

> `optional` **schemaAstConfig**: `SchemaASTConfig`

Configure how the schema.graphql file should be generated.

##### See

[SchemaASTConfig](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/other/schema-ast/src/index.ts#L23)

### urlSchemaOptions?

> `optional` **urlSchemaOptions**: `UrlSchemaOptions`

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

> `optional` **debug**: `boolean`

Defined in:
[options.ts:82](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L82)

Enable detailled debugging messages.

### Default

```ts
false
```

---

## devtools?

> `optional` **devtools**: `boolean`

Defined in:
[options.ts:180](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L180)

Enable Nuxt DevTools integration.

### Default

```ts
true
```

---

## documents?

> `optional` **documents**: `string`[]

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

> `optional` **downloadSchema**: `boolean`

Defined in:
[options.ts:108](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L108)

Download the GraphQL schema and store it on disk.

Usually you'll want to only enable this during dev mode.

### Default

```ts
true
```

---

## enableFileUploads?

> `optional` **enableFileUploads**: `boolean`

Defined in:
[options.ts:75](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L75)

Enable support for uploading files via GraphQL.

When enabled, an additional `useGraphqlUploadMutation` composable is included,
in addition to a new server endpoint that handles multi part file uploads for
GraphQL mutations.

---

## errorOverlay?

> `optional` **errorOverlay**: `boolean`

Defined in:
[options.ts:87](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L87)

Displays GraphQL response errors in an overlay in dev mode.

---

## experimental?

> `optional` **experimental**: `object`

Defined in:
[options.ts:208](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L208)

Experimental features.

### improvedQueryParamEncoding?

> `optional` **improvedQueryParamEncoding**: `boolean`

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
encoded using the \_\_variables fallback where all variables are JSON encoded.

---

## graphqlConfigFilePath?

> `optional` **graphqlConfigFilePath**: `string`

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

> `optional` **graphqlEndpoint**: `string`

Defined in:
[options.ts:99](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L99)

The URL of the GraphQL server.

If not provided, the module will use the
NUXT_GRAPHQL_MIDDLEWARE_GRAPHQL_ENDPOINT environment variable during dev mode.

For the runtime execution you can provide a method that determines the endpoint
during runtime. See the server/graphqlMiddleware.serverOptions.ts documentation
for more information.

---

## includeComposables?

> `optional` **includeComposables**: `boolean`

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

> `optional` **logOnlyErrors**: `boolean`

Defined in:
[options.ts:135](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L135)

Logs only errors.

When enabled only errors are logged to the console when generating the GraphQL
operations. If false, all operations are logged, including valid ones.

---

## schemaPath?

> `optional` **schemaPath**: `string`

Defined in:
[options.ts:118](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L118)

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

> `optional` **serverApiPrefix**: `string`

Defined in:
[options.ts:127](https://github.com/dulnan/nuxt-graphql-middleware/blob/main/src/build/types/options.ts#L127)

The prefix for the server route.

### Default

```ts
'/api/graphql_middleware'
```
