# MCP Integration

nuxt-graphql-middleware integrates with
[@nuxtjs/mcp-toolkit](https://github.com/nuxt-modules/mcp-toolkit) to expose
your GraphQL schema and operations to AI assistants and other MCP clients. This
enables AI tools like Claude to understand your GraphQL setup and help you work
with it more effectively.

::: warning Development Only

The MCP integration is only available in development mode. It requires access to
the GraphQL schema, operation documents, and other build-time information that
is not available in production builds.

:::

## Setup

### 1. Install @nuxtjs/mcp-toolkit

```bash
npm install --save-dev @nuxtjs/mcp-toolkit
```

### 2. Add the module and enable MCP

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit', 'nuxt-graphql-middleware'],

  graphqlMiddleware: {
    mcp: {
      enabled: true,
    },
  },
})
```

Both `@nuxtjs/mcp-toolkit` must be installed and `mcp.enabled` must be set to
`true` for the integration to work.

### 3. Configure your MCP client

Point your MCP client to the server URL. By default, the MCP server is available
at:

```
http://localhost:3000/mcp/nuxt-graphql-middleware
```

Below are configuration examples for popular MCP clients. For more details, see
the
[@nuxtjs/mcp-toolkit connection guide](https://mcp-toolkit.nuxt.dev/getting-started/connection).

#### Claude Code

Use the `mcp add` command:

```bash
claude mcp add nuxt-graphql-middleware http://localhost:3000/mcp/nuxt-graphql-middleware
```

#### Claude Desktop

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "nuxt-graphql-middleware": {
      "url": "http://localhost:3000/mcp/nuxt-graphql-middleware"
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "nuxt-graphql-middleware": {
      "url": "http://localhost:3000/mcp/nuxt-graphql-middleware"
    }
  }
}
```

#### VS Code

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "nuxt-graphql-middleware": {
      "type": "http",
      "url": "http://localhost:3000/mcp/nuxt-graphql-middleware"
    }
  }
}
```

## Configuration

You can customize the MCP integration in your Nuxt config:

```typescript
export default defineNuxtConfig({
  graphqlMiddleware: {
    mcp: {
      // Enable the MCP integration (default: false)
      enabled: true,

      // Custom route for the MCP server (default: /mcp/nuxt-graphql-middleware)
      route: '/mcp/nuxt-graphql-middleware',
    },
  },
})
```

## Docker / Nginx Setup

If you're running Nuxt behind a reverse proxy (e.g., nginx in Docker or DDEV)
and accessing it via a custom domain instead of `localhost:3000`, you might need
some additional configuration.

### Nginx Configuration

It's recommended to add a location block for the MCP endpoint. The key settings
are:

- `proxy_http_version 1.1` - Required for proper SSE/streaming support
- `proxy_set_header Connection ""` - Prevents connection reuse issues

```nginx
location /mcp/ {
  proxy_intercept_errors off;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  proxy_pass http://localhost:3000;
}
```

### MCP Client Configuration

When using a custom domain, update your MCP client configuration to use the
external URL instead of localhost. For example, when using
[DDEV](https://ddev.com):

```json
{
  "mcpServers": {
    "nuxt-graphql-middleware": {
      "url": "https://your-domain.ddev.site/mcp/nuxt-graphql-middleware"
    }
  }
}
```

::: tip

Make sure your reverse proxy forwards all necessary headers. The example nginx
configuration above handles this automatically.

:::

## How it Works

The MCP integration consists of two parts:

1. **MCP Tools** - Defined using `@nuxtjs/mcp-toolkit`, these are the tools that
   AI assistants can invoke. They are registered at the
   `/mcp/nuxt-graphql-middleware` endpoint.

2. **Dev Handler** - A development-only server handler at
   `/__nuxt_graphql_middleware/mcp` that has access to the module's internal
   `Collector` (which holds all GraphQL operations and fragments) and
   `SchemaProvider` (which holds the parsed GraphQL schema).

When an MCP tool is invoked by an AI assistant, it makes a POST request to the
dev handler, which processes the request and returns the requested information
(e.g., list of operations, schema type details, etc.).

This architecture ensures that all schema and document introspection happens
server-side, with the MCP tools acting as a bridge between AI assistants and the
module's build-time data.

## Available Tools

The MCP integration exposes the following tools to AI assistants:

### Operations

| Tool                         | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `operations-list`            | List all GraphQL operations (queries and mutations) in the project  |
| `operations-get`             | Get detailed information about a specific operation                 |
| `operations-get-source`      | Get the raw GraphQL source code of an operation                     |
| `operations-get-field-usage` | Find where a specific field is used across operations and fragments |

### Fragments

| Tool                      | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `fragments-list`          | List all GraphQL fragments in the project             |
| `fragments-get`           | Get detailed information about a specific fragment    |
| `fragments-get-source`    | Get the raw GraphQL source code of a fragment         |
| `fragments-list-for-type` | Get all fragments defined for a specific GraphQL type |

### Schema

| Tool                                | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `schema-get-type`                   | Get detailed information about a GraphQL type             |
| `schema-get-type-definition`        | Get the full SDL definition of a GraphQL type             |
| `schema-list-types`                 | List all types in the GraphQL schema (filterable by kind) |
| `schema-get-interface-implementors` | Get all types that implement a given interface            |
| `schema-get-union-members`          | Get all member types of a union                           |
| `schema-get-type-usage`             | Find where a type is used in the schema                   |
| `schema-validate-document`          | Validate a GraphQL document against the schema            |

### Execution

| Tool                 | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `graphql-execute`    | Execute an arbitrary GraphQL document against the configured endpoint |
| `operations-execute` | Execute an existing operation by name via the middleware              |

### Code Examples

| Tool                                 | Description                                                        |
| ------------------------------------ | ------------------------------------------------------------------ |
| `vue-graphql-composable-example`     | Generate Vue composable usage examples for a GraphQL operation     |
| `nitro-graphql-server-utils-example` | Generate Nitro server utils usage examples for a GraphQL operation |

### Module

| Tool                | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `module-get-config` | Get internal module configuration (paths, auto-import patterns) |

## Resources

The MCP server also exposes documentation resources that AI assistants can read
to understand how to use the module's composables and utilities.

## Use Cases

### Code Generation

AI assistants can use the schema tools to understand your GraphQL types and
generate TypeScript code, form components, or validation schemas that match your
API.

### Impact Analysis

Before modifying a GraphQL field, use `operations-get-field-usage` to understand
which operations and fragments would be affected by the change.

### Documentation

AI assistants can read the schema and generate documentation for your GraphQL
API, including type descriptions and field explanations.

### Query Building

With access to the schema and existing operations, AI assistants can help write
new GraphQL queries and mutations that follow your project's patterns.

### Validation

Use `schema-validate-document` to validate GraphQL documents before committing
them to your codebase.

### Usage Examples

Use `vue-graphql-composable-example` and `nitro-graphql-server-utils-example` to
generate code examples showing how to use a specific GraphQL operation with the
module's composables or server utilities. This helps AI assistants provide
accurate, copy-pasteable code snippets that follow the module's patterns.
