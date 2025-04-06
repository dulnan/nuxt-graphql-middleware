---
title: Overview
editLink: true
---

# Overview

nuxt-graphql-middleware exposes your GraphQL queries and mutations as simple
JSON endpoints using
[Nuxt server routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes).

It offers fully typed
[composables](https://vuejs.org/guide/reusability/composables.html) to perform
GraphQL requests using Nuxt's built-in
[$fetch](https://v3.nuxtjs.org/api/utils/$fetch) method.

This module was created to solve the following problems:

- Lots of GraphQL oeprations can bloat the client bundle
- By default GraphQL POST requests are not easily cachable
- The GraphQL server must be exposed

All of these challenges could also be solved with existing libraries and
solutions such as
[Persisted Queries](https://www.apollographql.com/docs/kotlin/advanced/persisted-queries).
However, this is not always possible, for example if the GraphQL server does not
support these features. They may also require additional build steps.

## Solution: GraphQL only on the server

By moving all GraphQL requests and logic to the server side of your Nuxt app, we
can solve all of the listed problems:

- Query operations are GET requests and can be cached on CDNs or other caching
  layers
- No GraphQL documents in client bundles
- The GraphQL server can be made inaccessible for public requests, for example
  using basic auth
