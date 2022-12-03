# Nuxt GraphQL Middleware

GraphQL in the backend, fetch in the frontend. With TypeScript support.

## Idea
When using GraphQL you have to bundle your queries in your frontend build and
send them with every request. If you have lots of queries and/or fragments,
this can increase your frontend bundle size significantly. In addition you have
to expose your entire GraphQL endpoint to the public (if you don't use persisted
queries).

This module aims to fix this by performing any GraphQL requests only on the
server side. It passes the response to the frontend via a simple JSON endpoint.
So you can have all the benefits of GraphQL but without any bloat.

It optionally generates TypeScript type files of your schema, queries and
mutations via [graphql-codegen](https://github.com/dotansimha/graphql-code-generator).

## Features
- GraphQL queries and mutations using graphql-request
- Client plugin to perform queries or mutations
- Fully flexible: Modify request headers, responses or handle errors
- HMR for queries and mutations
- TypeScript integration for schema, queries and mutations

# Setup

## Install
```bash
npm install --save nuxt-graphql-middleware
```

Minimal configuration needed:
```javascript
export default defineNuxtConfig({
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

Alternatively you can call `http://localhost:3000/api/graphql_middleware/query/films`.
