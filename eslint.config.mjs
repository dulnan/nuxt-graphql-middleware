import withNuxt from './playground/.nuxt/eslint.config.mjs'
import prettier from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import importPlugin from 'eslint-plugin-import-x'

const nuxtProvidedPackages = [
  // Nuxt ecosystem.
  'vue',
  'h3',
  'nitropack',
  'pathe',
  'defu',
  'ohash',
  'ufo',
  'consola',
  'ofetch',
  // Peer dependencies.
  'graphql',
  'zod',
  '@modelcontextprotocol/sdk',
]

export default withNuxt(
  {
    plugins: {
      prettier,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      ...eslintPluginPrettierRecommended.rules,
    },
  },
  {
    files: ['src/build/**/*.ts'],
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: true,
          whitelist: nuxtProvidedPackages,
        },
      ],
    },
  },
  {
    files: ['src/runtime/**/*.ts'],
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: true,
          whitelist: nuxtProvidedPackages,
        },
      ],
    },
  },
).override('nuxt/typescript/rules', {
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
})
