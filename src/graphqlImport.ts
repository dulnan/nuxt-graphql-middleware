const fragmentImport = require('@graphql-fragment-import/lib/inline-imports')

export default function (path: string, resolver: any) {
  return fragmentImport(path, {
    resolveImport(identifier: string) {
      return resolver(identifier)
    },
    resolveOptions: {
      basedir: './',
    },
  })
}
