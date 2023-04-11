# Fragments

You can create reusable fragments and import them in other GraphQL files.

#### components/Film/film.fragment.graphql

```graphql
fragment film on Film {
  id
  title
  edited
}
```

#### pages/allFilms.query.graphql

```graphql
#import "~/components/Film/film.fragment.graphql"

query allFilms {
  allFilms {
    films {
      ...film
    }
  }
}
```

The path is always relative to your app root and is being resolved by Nuxt, e.g.
you can also use aliases like `~`, `@` or `#custom-alias`.
