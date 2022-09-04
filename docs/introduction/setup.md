# Setup

## Step 1: Install

Install the module using your preferred package manager.

```sh
npm install --save nuxt-graphql-middleware
```

## Step 2: Configure

Add the module to your Nuxt config and provide the basic configuration.

```typescript
// ./nuxt.config.ts
import { defineNuxtConfig } from 'nuxt'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],

  graphqlMiddleware: {
    graphqlEndpoint: 'https://example.com/graphql',
  }
})
```

## Step 3: Write a query

Write your first query and save it wherever you like. By default all
`*.graphql` or `*.gql` files in your app (excluding node_modules) are
auto-imported.

```graphql
# ./pages/films.query.graphql
query films {
  allFilms {
    films {
      ...film
    }
  }
}
```

## Step 4: Use the query

Your query is now exposed as a JSON endpoint:

```
http://localhost:3000/api/graphql_middleware/query/films
```

### useGraphqlQuery

nuxt-graphql-middleware provides a composable for easy querying. Arguments and
return values are fully typed.

```typescript
const { data } = await useGraphqlQuery('films')
console.log(data.allFilms.films)
```

### useFetch/$fetch

If you wish, you can also use Nuxt's built-in useFetch composable:

```typescript
const { data } = await useFetch('/api/graphql_middleware/films')
console.log(data.data.allFilms.films)
```
