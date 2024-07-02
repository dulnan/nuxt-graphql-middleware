# Fragments

You can create reusable fragments and either import them in other GraphQL files
or let nuxt-graphql-middleware automatically inline them for you.

::: warning

Fragment names, just as query/mutation names, must be unique across the entire
repository.

:::

## Manual import

By default, fragments have to be manually imported in every GraphQL file. This
is done using the special `#import` syntax at the top of a file:

::: code-group

```graphql [pages/allFilms.query.graphql]
#import "~/components/Film/film.fragment.graphql" // [!code highlight]

query allFilms {
  allFilms {
    films {
      ...film
    }
  }
}
```

:::

::: code-group

```graphql [components/Film/film.fragment.graphql]
fragment film on Film {
  id
  title
  edited
}
```

:::

The path is always relative to your app root and is being resolved by Nuxt, e.g.
you can also use aliases like `~`, `@` or `#custom-alias`.

## Automatic import

It's possible to automatically inline fragments:

::: code-group

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['nuxt-graphql-middleware'],

  graphqlMiddleware: {
    autoInlineFragments: true, // [!code highlight]
  },
})
```

:::

This will disable importing via `#import` and will automatically inline
fragments:

::: code-group

```graphql [query.getUsers.graphql]
query userById($id: ID!) {
  ...getUserQuery
}
```

```graphql [fragment.getUserQuery.graphql]
fragment getUserQuery on Query {
  userById(id: $id) {
    ...user
  }
}
```

```graphql [fragment.user.graphql]
fragment user on User {
  id
  firstName
  lastName
  email
  description
  dateOfBirth
}
```

:::
