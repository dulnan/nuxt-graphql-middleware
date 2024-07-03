# useGraphqlMutation

Same usage like useGraphqlQuery, but for mutations:

```typescript
const { data } = await useGraphqlMutation('trackVisit')
```

```typescript
const { data } = await useGraphqlMutation('addToCart', { id: '456' })
```

## Custom Fetch Options

In addition to the fetch options set when using
[/composables/useGraphqlState](useGraphqlState), you can also set fetch options
here (which will override properties set by the useGraphqlState composable):

```typescript
const { data } = await useGraphqlMutation(
  'addToCart',
  { id: '456' },
  {
    onRequest(options) {
      options.headers['Custom-Special-Header'] = 'Foobar'
    },
  },
)
```
