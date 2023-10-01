# Debugging

The module offers several ways to make it easier to debug GraphQL queries and
mutations.

## Nuxt DevTools

You can inspect queries, mutations and fragments within
[Nuxt DevTools](https://devtools.nuxtjs.org). Look for the **GraphQL
Middleware** tab.

![Screenshot of the Nuxt DevTools integration](./../nuxt-devtools.png)

## Debug Server Route

There is a server route available during development that outputs all queries
and mutations.

![Screenshot of the debug endpoint](./../debug-endpoint.png)

## Output compiled queries and mutations

If you set the `outputDocuments` option to `true` the module will output all
compiled documents in the build folder:
`./.nuxt/nuxt-graphql-middleware/documents`.
