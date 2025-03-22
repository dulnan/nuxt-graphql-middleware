# TypeScript Codegen

Type definitions for your queries, mutations and fragments are generated
automatically using
[graphql-typescript-deluxe](https://www.github.com/dulnan/graphql-typescript-deluxe).

You can provide custom configuration for graphql-codegen using the
[`codegenConfig` configuration property](/configuration/module.html#codegenconfig-typescriptdocumentspluginconfig).

## Queries

Given this query:

```graphql
query allFilms {
  allFilms {
    films {
      id
      title
      edited
    }
  }
}
```

The following type is generated:

```typescript
export type AllFilmsQuery = {
  allFilms?: {
    films?: Array<{
      id: string
      title?: string | null
      edited?: string | null
    } | null> | null
  } | null
}
```

## Fragments

Types for fragments are also generated:

```graphql
fragment film on Film {
  id
  title
  edited
}
```

```typescript
export type FilmFragment = {
  title?: string | null
  director?: string | null
  edited?: string | null
}
```

## Importing types

You can import types via the `#graphql-operations` alias:

```vue
<script setup lang="ts">
import type { FilmFragment } from '#graphql-operations'

defineProps<{
  film: FilmFragment
}>()
</script>
```
