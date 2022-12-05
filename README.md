![nuxt-graphql-middleware banner](docs/banner.png?raw=true "Nuxt GraphQL Middleware - Expose queries and mutations as fully typed API routes.")

# Nuxt GraphQL Middleware

Expose GraphQL queries and mutations as fully typed API routes.

**[Documentation](https://nuxt-graphql-middleware.dulnan.net)** – **[npm](https://www.npmjs.com/package/nuxt-graphql-middleware)** – **[Version 2.x (for Nuxt 2)](https://github.com/dulnan/nuxt-graphql-middleware/tree/2.x)**

[![Test](https://github.com/dulnan/nuxt-graphql-middleware/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/dulnan/nuxt-graphql-middleware/actions/workflows/node.js.yml)

## Features
- Exposes each query and mutation as an API route
- GraphQL requests are only done on the server side
- No GraphQL documents in client bundle
- Includes composables to perform queries or mutations
- Modify request headers, responses and handle errors
- HMR for all GraphQL files
- Full TypeScript integration for schema, queries, mutations and fragments using [graphql-code-generator](https://github.com/dotansimha/graphql-code-generator)

# Setup

## Install
```bash
npm install --save nuxt-graphql-middleware
```

Minimal configuration needed:
```javascript
export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://example.com/graphql',
  }
})
```

## Usage

Write your first query, e.g. in pages/films.query.graphql:

```graphql
query films {
  allFilms {
    films {
      id
    }
  }
}
```

Your query is now available via the useGraphqlQuery() composable:

```typescript
const { data } = await useGraphqlQuery('films')
console.log(data.allFilms.films)
```

Alternatively you can also call
`http://localhost:3000/api/graphql_middleware/query/films` to get the same
result.

## Nuxt 2

The 3.x releases are only compatible with Nuxt 3. The [2.x branch](https://github.com/dulnan/nuxt-graphql-middleware/tree/2.x) and releases
on npm are compatible with Nuxt 2.
