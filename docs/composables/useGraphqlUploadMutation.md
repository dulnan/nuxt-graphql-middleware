# useGraphqlUploadMutation

This composable is only available when setting `enabledFileUploads` to `true` in
the module's configuration. It allows to upload files inside a mutation. The
implementation follows the
[GraphQL multipart request specification](https://github.com/jaydenseric/graphql-multipart-request-spec),
which is supported by a lot of GraphQL servers.

## Basic Usage

The composable handles the FormData part, so files can be directly provided
inside the mutation variables:

```typescript
async function upload(image: File) {
  const data = await useGraphqlUploadMutation('uploadImage', {
    image,
  })
}
```

Multiple files are also supported, both in the same field or in deeply nested
fields:

```typescript
const files = ref<File[]>([])

const data = await useGraphqlUploadMutation('uploadFiles', {
  elements: files.value.map((file) => {
    return {
      name: file.name,
      file: file,
    }
  }),
})
```

## Server Route

To support file uploads, when the feature is enabled, an additional server route
is added:

```
/api/graphql_middleware/upload/[name_of_mutation]
```

This route expects a `multipart/form-data` request. The
`useGraphqlUploadMutation` composable makes sure the data is sent in the correct
format.

The server route does not perform any validations on the provided data, for
example there is no file size limitation. This should be handled separately, for
example on the web server or by implementing a custom Nitro middleware.

In addition, the route does not save any of the files. It only validates that a
valid, existing mutation is used. It also makes sure that it's not possible to
send arbitrary operations.
