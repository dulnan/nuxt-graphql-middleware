# Fragments

You can create reusable fragments and either import them in other GraphQL files
or let nuxt-graphql-middleware automatically inline them for you.

::: warning

Fragment names, just as query/mutation names, must be unique across the entire
repository.

:::

## Automatic Import

All fragments are imported automatically, without the need for manual import
statements. Make sure that all your fragment files or folders are referenced in
the `autoImportPatterns` option.

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
