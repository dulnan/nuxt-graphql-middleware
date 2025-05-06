import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    coverage: {
      all: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.*'],
    },
    environmentOptions: {
      nuxt: {
        overrides: {
          modules: ['nuxt-graphql-middleware'],
          graphqlMiddleware: {
            graphqlEndpoint: 'http://localhost/graphql',
            downloadSchema: false,
          },
        },
      },
    },
  },
})
