import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // include: ['test/**/*.test.ts'],
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.*'],
    },
  },

  resolve: {
    alias: {
      '#nuxt-graphql-middleware/config': path.resolve(
        __dirname,
        './.nuxt/nuxt-graphql-middleware/config.js',
      ),
      '#nuxt-graphql-middleware/operation-variables': path.resolve(
        __dirname,
        './.nuxt/nuxt-graphql-middleware/operation-variables.js',
      ),
      'graphql/language/printer': 'graphql/language/printer.js',
      'graphql/language': 'graphql/language/index.js',
      graphql: 'graphql/index.js',
    },
  },
})
