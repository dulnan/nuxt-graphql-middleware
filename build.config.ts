import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  emitCJS: false,
  cjsBridge: true,
  //entries: ['src/module', 'src/templates/plugin'],
  entries: [
    //'src/templates/plugin',
    { input: 'src/module', format: 'esm', builder: 'rollup' },
  ],
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
