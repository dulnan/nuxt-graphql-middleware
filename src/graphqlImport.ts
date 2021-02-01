const fragmentImport = require('@graphql-fragment-import/lib/inline-imports');

export default function(path: string, basedir: string) {
  return fragmentImport(path, {
    resolveOptions: {
      basedir,
    }
  });
}
