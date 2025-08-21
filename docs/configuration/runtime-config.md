# Runtime Config

The following
[runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
are provided by the module:

## GraphQL Endpoint

Allows you to set or override the
[`graphqlEndpoint`](/configuration/module#graphqlendpoint) option.

You can set the GraphQL endpoint to use by setting the
`NUXT_GRAPHQL_MIDDLEWARE_GRAPHQL_ENDPOINT` environment variable:

```bash
NUXT_GRAPHQL_MIDDLEWARE_GRAPHQL_ENDPOINT=http://example.com/graphql
```

This is used to _download the schema_ in **dev mode**. A
[`graphqlEndpoint`](/configuration/server-options#graphqlendpoint) method
provided by your server options will take precedence when _making GraphQL
queries_. If no method exists, then the value of the environment variable is
also used at runtime (e.g. running the Nuxt build).
