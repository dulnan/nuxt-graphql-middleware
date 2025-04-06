# useAsyncGraphqlQuery

This is a convenience wrapper for using `useGraphqlQuery` inside `useAsyncData`.
In addition, it will automatically refetch the data during development when the
underlying GraphQL document (or used fragments) change.

```typescript
const { data } = await useAsyncGraphqlQuery('users')
```

This is identical to:

```typescript
const { data } = await useAsyncData(() => useGraphqlQuery('users'))
```

It also works with variables which may also be reactive, in addition to
providing options for `useAsyncData`:

```typescript
const route = useRoute()

const variables = computed<UserByIdQueryVariables>(() => {
  const id = route.params.id.toString()
  return {
    id,
  }
})

const { data: user } = await useAsyncGraphqlQuery('userById', variables, {
  transform: function (v) {
    return v.data.userById
  },
})
```

This will automatically add the provided variables to the `watch` property in
the `useAsyncData` options. Meaning, the query is automatically refreshed when
`variables` changes.
