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
    'defu',
    'pathe',
    'change-case',
    'change-case-all',
    'sirv',
    'totalist/sync',
    '@polka/url',
    'mrmime',
    '#graphql-middleware/types',
    '#build/nuxt-graphql-middleware',
    '#graphql-middleware-server-options-build',
  ],
})
