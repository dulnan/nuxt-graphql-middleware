# Auto Import

By default all files ending in `.gql` or `.graphql` in your app root (excluding
node_modules) are automatically imported. Changing a file will perform
validation and compile the generated templates (such as types).

## Naming

You must name every query and mutation operation with a unique name. The name is
used to identify the query or mutations in the server handler and when
[generating types](/features/typescript). The name of the file is not relevant.

## Nuxt Layers

GraphQL files are also imported from all
[Nuxt layers](https://nuxt.com/docs/getting-started/layers). The app can
override a fragment or operation of a layer by defining one with the same name.
For example, to add a field to a fragment of a layer:

::: code-group

```graphql [layers/base/app/components/Teaser/fragment.teaser.graphql]
fragment teaser on Article {
  title
}
```

```graphql [app/components/Teaser/fragment.teaser.graphql]
fragment teaser on Article {
  title
  image
}
```

:::

Only the overriding definition is used, also by operations of the layer that
reference the fragment. When names collide, the first one in this list wins:

1. The app
2. Documents and files provided by modules via
   [hooks](/configuration/module-hooks)
3. The extended layers, in the order they are defined

The [`documents`](/configuration/module#documents) option ranks as the
`nuxt.config` it is set in: the app's or that of a layer.

Definitions with the same name and the same rank fail the build, for example two
files in the app that define the same fragment, or two modules that add a
fragment with the same name.

When the app overrides a definition of a module, a warning is logged, because
the code of the module may rely on the fields of its definition. If the override
is intended, check whether the module has an option to not add its definition.

::: info

The generated `graphql.config.ts` still includes the files of all layers, so the
GraphQL language server in your IDE may report overridden definitions as
duplicates.

:::

## Custom import pattern

You can use the
[`autoImportPatterns`](/configuration/module.html#autoimportpatterns-string)
config property to manually define locations where GraphQL files should be
searched for.

## Dynamic GraphQL documents

You can also directly provide one or more GraphQL document as a string using the
[`documents`](/configuration/module.html#documents-string) config property.
