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

## Rationale

This module was created to solve the following problems:

- Lots of GraphQL queries bloat the client bundle
- GraphQL requests are not easily cachable
- GraphQL server is exposed
- Client libraries tend be large

Sure, there are various ways that each of these problems can be solved, but they
tend to be quite complex and require lots of build tooling.

## Solution: GraphQL only on the server

By moving all GraphQL requests and logic to the server side of your Nuxt app, we
can solve all of the listed problems:

- No queries are bundled
- Queries are GET requests and can be easily cached
- GraphQL endpoint is only accessible by Nuxt on your server
- 0kb client library
