import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    'ofetch',
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
    'micromatch',
    '@clack/core',
    'is-unicode-supported',
  ],
})
