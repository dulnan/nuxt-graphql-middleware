import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule, { type ModuleOptions } from './../src/module'
const IS_DEV = process.env.NODE_ENV === 'development'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: IS_DEV,
  codegenConfig: {},
  outputDocuments: true,
  autoImportPatterns: [
    './pages/**/*.graphql',
    './components/**/*.graphql',
    './layouts/**/*.graphql',
    './server/**/*.graphql',
  ],
  autoInlineFragments: true,
  documents: [
    `
    query usersFromConfig {
      users {
        id
      }
    }
    `,
  ],
  codegenSchemaConfig: {
    urlSchemaOptions: {
      headers: {
        authentication: 'server-token',
      },
    },
  },

  clientCache: {
    enabled: true,
  },
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule, '@nuxt/devtools', '@nuxt/eslint'],
  graphqlMiddleware,
  ssr: true,
  imports: {
    autoImport: false,
  },
} as any)
