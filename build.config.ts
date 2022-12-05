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
    'change-case',
    'change-case-all',
  ],
})
