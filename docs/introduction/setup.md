# Setup

## Step 1: Install

Install the module using your preferred package manager.

```sh
npx nuxi@latest module add nuxt-graphql-middleware
```

## Step 2: Configure

Add the module to your Nuxt config and provide the basic configuration.

```typescript
// ./nuxt.config.ts
import { defineNuxtConfig } from 'nuxt'

const IS_DEV = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],

  graphqlMiddleware: {
    graphqlEndpoint: 'https://example.com/graphql',
    downloadSchema: IS_DEV,
  },
})
```

The module will attempt to download the schema from the provided endpoint and
store it locally. By setting `downloadSchema` to `true` only during development
the module will use the already downloaded schema during build.

### Optional: Configure IDE integration

In order for your IDE/LSP to be aware of your operations and fragments you need
to define a
[GraphQL config file](https://the-guild.dev/graphql/config/docs/user/usage).

The module will generate a graphql.config.ts file during build which you can
extend from. Create a file named `graphql.config.ts` in the **same folder as
nuxt.config.ts** with these contents:

::: code-group

```typescript [~/graphql.config.ts]
import config from './playground/.nuxt/nuxt-graphql-middleware/graphql.config'

export default config
```

:::

## Step 3: Write a query

Write your first query and save it wherever you like. By default all `*.graphql`
or `*.gql` files in your app (excluding node_modules) are auto-imported.

Let's name the query `films`. The file name is not relevant.

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

Your query is now available under the following URL:

```
http://localhost:3000/api/graphql_middleware/query/films
```

### useGraphqlQuery

The module provides a composable for easy querying. Arguments and return values
are fully typed.

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
