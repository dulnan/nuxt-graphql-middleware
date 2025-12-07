# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Setup
```sh
npm install                    # Install dependencies
npm run dev:prepare            # Generate types (required before development)
```

### Start Apollo Server (Required for Playground)
```sh
cd apollo && npm install && npm run compile && npm run start
```

### Development
```sh
npm run dev                    # Start playground at localhost:3000
npm run dev:layers             # Start playground-layers
```

### Testing
```sh
npm run test                   # Run Vitest in watch mode
npm run test:ci                # Run Vitest once
npm run test:coverage          # Run with coverage report
```

### E2E Testing (Cypress)
```sh
npm run dev:build              # Build playground first
npm run dev:start              # Start built playground
npm run cypress                # Run Cypress tests
npm run cypress:open           # Open Cypress UI
```

### Linting & Formatting
```sh
npm run lint                   # ESLint check
npm run lint:fix               # ESLint fix
npm run prettier               # Prettier check
npm run prettier:fix           # Prettier fix
npm run typecheck              # TypeScript check (module + playgrounds)
```

### Build
```sh
npm run prepack                # Full module build (styles + module + client)
```

## Architecture

This is a Nuxt 3 module that exposes GraphQL queries and mutations as fully-typed server-side API routes. GraphQL requests happen only on the server; no GraphQL documents are included in the client bundle.

### Directory Structure

- `src/` - Module source code
  - `module.ts` - Main module entry point
  - `build/` - Build-time code generation
    - `Collector.ts` - Discovers and validates GraphQL documents
    - `SchemaProvider.ts` - Loads/downloads GraphQL schema
    - `ModuleHelper.ts` - Manages paths, resolvers, configuration
    - `ModuleContext.ts` - Public API for module hooks
    - `templates/definitions/` - Code generation templates
  - `runtime/` - Runtime code (browser + server)
    - `composables/` - Client-side composables (`useGraphqlQuery`, `useGraphqlMutation`, etc.)
    - `server/api/` - Server handlers for `/api/graphql_middleware/query/:name` and `/api/graphql_middleware/mutation/:name`
    - `server/utils/` - Server utilities including `doGraphqlRequest.ts`
    - `plugins/` - Nuxt plugins (`provideState.ts`, `devMode.ts`)
    - `helpers/` - Shared helpers (`ClientCache.ts`, `queryEncoding.ts`)
- `playground/` - Example Nuxt app for development
- `playground-layers/` - Example with Nuxt layers
- `apollo/` - Apollo server used by playground
- `docs/` - VitePress documentation
- `test/` - Vitest unit tests
- `cypress/` - E2E tests

### Key Patterns

**Code Generation Flow**: GraphQL schema is loaded via `SchemaProvider`, documents are collected by `Collector`, then `graphql-typescript-deluxe` generates TypeScript types. Templates in `src/build/templates/definitions/` produce runtime code and type definitions.

**Server Routes**: Each GraphQL operation becomes an API route. Queries use GET (`/api/graphql_middleware/query/:name`), mutations use POST (`/api/graphql_middleware/mutation/:name`).

**Customization Hooks**:
- `nuxt-graphql-middleware:init` - Add documents/files before initialization
- `nuxt-graphql-middleware:build` - React to code generation output

**Server Options** (defined via `defineGraphqlServerOptions`):
- `graphqlEndpoint()` - Dynamic endpoint resolution
- `serverFetchOptions()` - Custom headers/auth
- `onServerResponse()` - Transform responses
- `onServerError()` - Custom error handling
- `doGraphqlRequest()` - Complete request override

**Client Options** (defined via `defineGraphqlClientOptions`):
- `buildClientContext()` - Pass dynamic context (language, locale) to server

### Module Aliases
- `#nuxt-graphql-middleware` - Generated module files
- `#graphql-operations` - Generated GraphQL operation types

### Testing Notes
- Unit tests are in `test/` and use Vitest
- E2E tests are in `cypress/e2e/` and run against the built playground
- Tests require running `npm run dev:prepare` first for type generation
