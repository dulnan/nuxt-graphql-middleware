import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/client-options.ts',
    './src/server-options.ts',
    './src/utils.ts',
  ],
  externals: [
    'ofetch',
    'ohash',
    'h3',
    'graphql',
    '@graphql-tools/load',
    '@graphql-tools/merge',
    'chalk',
    '@graphql-codegen/plugin-helpers',
    '@graphql-codegen/core',
    '@graphql-tools/schema',
    'defu',
    'pathe',
    'change-case',
    'change-case-all',
    'sirv',
    'consola',
    'totalist/sync',
    '@polka/url',
    'mrmime',
    '#nuxt-graphql-middleware/response',
    '#nuxt-graphql-middleware/client-options',
    '#nuxt-graphql-middleware/server-options',
    'micromatch',
    '@clack/core',
    'is-unicode-supported',
  ],
  replace: {
    'process.env.PLAYGROUND_MODULE_BUILD': 'undefined',
  },
})
