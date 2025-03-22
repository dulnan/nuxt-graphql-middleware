# Auto Import

By default all files ending in `.gql` or `.graphql` in your app root (excluding
node_modules) are automatically imported. Changing a file will perform
validation and compile the generated templates (such as types).

## Naming

You must name every query and mutation operation with a unique name. The name is
used to identify the query or mutations in the server handler and when
[generating types](/features/typescript). The name of the file is not relevant.

## Custom import pattern

You can use the
[`autoImportPatterns`](/configuration/module.html#autoimportpatterns-string)
config property to manually define locations where GraphQL files should be
searched for.

## Dynamic GraphQL documents

You can also directly provide one or more GraphQL document as a string using the
[`documents`](/configuration/module.html#documents-string) config property.
