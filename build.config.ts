import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: false,
  emitCJS: false,
  cjsBridge: true,
  entries: ['src/module', 'src/templates/plugin'],
  inlineDependencies: false,
  externals: [
    '@graphql-codegen/cli',
    '@nuxt/kit-edge',
    '@nuxt/types',
    '@types/express-serve-static-core',
    'express',
  ],
  dependencies: ['esbuild', 'typescript', 'express'],
})
