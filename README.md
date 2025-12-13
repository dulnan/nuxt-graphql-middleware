![nuxt-graphql-middleware banner](docs/banner.png?raw=true 'Nuxt GraphQL Middleware - Expose queries and mutations as fully typed API routes.')

# nuxt-graphql-middleware

A GraphQL client for Nuxt 3.

**[Documentation](https://nuxt-graphql-middleware.dulnan.net)** –
**[npm](https://www.npmjs.com/package/nuxt-graphql-middleware)** –
**[Version 2.x (for Nuxt 2)](https://github.com/dulnan/nuxt-graphql-middleware/tree/2.x)**

[![Test](https://github.com/dulnan/nuxt-graphql-middleware/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/dulnan/nuxt-graphql-middleware/actions/workflows/node.js.yml)

## Features

- Exposes each query and mutation as an **API route**
- GraphQL requests are done **only on the server side**
- Includes **composables** to perform queries or mutations
- **No GraphQL documents** in client bundle
- Super fast **TypeScript code generation** using
  **[graphql-typescript-deluxe](https://github.com/dulnan/graphql-typescript-deluxe)**
- **HMR** for all GraphQL files
- **[MCP integration](https://nuxt-graphql-middleware.dulnan.net/features/mcp)**
  to expose schema and operations to AI assistants
- Optional **Client side caching** for query operations
- Modify **request headers**, responses and handle errors
- Integration with **[Nuxt DevTools](https://devtools.nuxtjs.org)**

## Setup

### Install

```bash
npx nuxi@latest module add nuxt-graphql-middleware
```

Minimal configuration needed:

```javascript
export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlEndpoint: 'https://example.com/graphql',
  },
})
```

See
[all configuration options](https://nuxt-graphql-middleware.dulnan.net/configuration/module)

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
const { data, errors } = await useGraphqlQuery('films')
console.log(data.allFilms.films)
```

Or using the convenience wrapper for useAsyncData:

```typescript
const { data } = await useAsyncGraphqlQuery('films')
console.log(data.value.allFilms.films)
```

Alternatively you can also directly call the API route to get the same result:

```typescript
const response = await $fetch('/api/graphql_middleware/query/films')
```

Or using `useFetch`:

```typescript
const { data } = await useFetch('/api/graphql_middleware/query/films')
```

## Nuxt 2

The 3.x releases are only compatible with Nuxt 3. The
[2.x branch](https://github.com/dulnan/nuxt-graphql-middleware/tree/2.x) and
releases on npm are compatible with Nuxt 2. However this version is not
maintained anymore.

## Development

The module uses the default Nuxt module authoring setup where the module itself
is located in `./src`, with a playground located in `./playground/`.

### Setup

#### Install dependencies

Install the dependencies of the module and playground:

```sh
npm install
```

#### Prepare Types

This will generate all the types needed to start developing:

```sh
npm run dev:prepare
```

#### Start Apollo Server

The playground uses an Apollo server that needs to be built separately.

```sh
cd apollo
npm install
npm run compile
npm run start
```

### Start the Playground

```sh
npm run dev
```

You can now open http://localhost:3000 to start developing.

### Testing

#### Lint / Code Style

```sh
npm run lint
npm run prettier
```

#### Unit Tests (Vitest)

Unit tests are done using Vitest.

```sh
npm run test:ci
```

#### E2E (Cypress)

We use Cypress to run some E2E tests. The tests are executed against the
playground **build**:

```sh
npm run dev:build
npm run dev:start
npm run cypress
```
