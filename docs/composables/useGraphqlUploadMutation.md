# useGraphqlUploadMutation

This composable is only available when setting `enableFileUploads` to `true` in
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

This route expects a `multipart/form-data` request with the
`x-nuxt-graphql-middleware-upload` header (any value). Requests without the
header are refused with a 400 status code. The `useGraphqlUploadMutation`
composable makes sure the data is sent in the correct format and with the
header.

Only mutations with a variable of the `Upload` scalar type, directly or in an
input type, can be performed via this route. Other mutations are refused with a
400 status code and are a type error in `useGraphqlUploadMutation`. If your
schema uses a different name for the scalar, set it with the
[`fileUploadScalar`](/configuration/module#fileuploadscalar) option.

Requests larger than 50 MB (all files of a request together) are refused with a
413 status code. The limit can be changed with the
[`bodySizeLimit.upload`](/configuration/module#bodysizelimit) option. Apart from
that, the server route does not perform any validations on the files, for
example of their type. This should be handled by the GraphQL server.

In addition, the route does not save any of the files. It only validates that a
valid, existing mutation is used. It also makes sure that it's not possible to
send arbitrary operations: Every file must be listed in the `map` field, with
the path of a `null` value in the variables, such as `variables.file`. Requests
with other files or paths are refused with a 400 status code. The route then
builds a new request for the GraphQL server, in which the files are named `0`,
`1`, etc., so that no field names from the request are passed on.
