# Dynamic Server Routes

All GraphQL requests are only performed on the server. This is done by exposing
a server route for each query and mutation, which performs the GraphQL request
and then returns the response.

By using Nuxt's built-in server handler feature all requests to the server route
during SSR are directly passed from $fetch to the server route. This means there
is no unnecessary request made from your app to your app. It's esentially like
directly making the request to the GraphQL endpoint.

## Query

Given the following query:

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

It is available as a server route here:

```
/api/graphql_middleware/query/films
```

## Query with variables

Variables are also supported:

```graphql
# ./pages/filmById.query.graphql
query filmById($id: ID) {
  film(id: $id) {
    title
    director
    edited
  }
}
```

Variables are sent as query parameters:

```
/api/graphql_middleware/query/filmById?id=123
```

Since some queries can contain complex variables (arrays, objects) that can't
easily be converted to query parameters, they are sent as a JSON encoded string
as a single param `__variables`.

```typescript
const variables = {
  search: {
    text: 'foobar',
  },
}
```

```
/api/graphql_middleware/query/complex?__variables=%7B%22search%22:%7B%22text%22:%22foobar%22%7D%7D
```

## Mutation

Given the following mutation:

```graphql
# ./pages/trackVisit.mutation.graphql
mutation trackVisit {
  trackVisit {
    errors
  }
}
```

It is available as a server route here:

```sh
curl -X POST http://localhost:3000/api/graphql_middleware/mutations/trackVisit
```

## Mutation with variables

Given the following mutation using variables:

```graphql
# ./pages/addToCart.mutation.graphql
mutation addToCart($id: String!) {
  addToCart(id: $id) {
    errors
  }
}
```

Mutation variables are sent as the request body.

```sh
curl http://localhost:3000/api/graphql_middleware/mutations/trackVisit \
  -d '{"id":"123"}' \
  -H "Content-Type: application/json" \
  -X POST
```
