# Composables

nuxt-graphql-middleware provides three fully typed composables to perform
queries and mutations.

## useGraphqlQuery

Executes a query using $fetch and returns the response.

```typescript
const { data } = await useGraphqlQuery('films')
```

Variables can be passed as the second argument:

```typescript
const { data } = await useGraphqlQuery('filmById', { id: '123' })
```

Arguments are properly type checked:

```typescript
// ✅ Everyting correct.
const { data } = await useGraphqlQuery('filmById', { id: '123' })

// ❌ Wrong variable type.
const { data } = await useGraphqlQuery('filmById', { id: 123 })

// ❌ Missing variables.
const { data } = await useGraphqlQuery('filmById')

// ❌ Wrong query name.
const { data } = await useGraphqlQuery('getFilmById', { id: '123' })
```

The return value is also properly typed based on the query response:

```typescript
const { data } = await useGraphqlQuery('filmById', { id: '123' })

// ❌ Property does not exist.
console.log(data.films)

// ❌ Object is possibly null.
console.log(data.allFilms.films)

// ✅ Everyting correct.
console.log(data.allFilms?.films)
```

### Fetch Options

You can also pass an object instead, which allows you to additionally provide
fetch options for the request:

```typescript
const { data } = await useGraphqlQuery({
  name: 'filmById',
  variables: { id: '123' },
  fetchOptions: {
    headers: {
      authorization: 'foobar'
    }
  }
})
```

## useGraphqlMutation

Same usage like useGraphqlQuery:

```typescript
const { data } = await useGraphqlMutation('trackVisit')
```

```typescript
const { data } = await useGraphqlMutation('addToCart', { id: '456' })
```
