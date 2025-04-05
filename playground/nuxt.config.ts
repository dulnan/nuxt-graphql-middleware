import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule from './../src/module'
import type { ModuleOptions } from '../src/module/types/options'
const IS_DEV = process.env.NODE_ENV === 'development'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: IS_DEV,
  autoImportPatterns: ['~/**/*.{graphql,gql}', '!queryFromDisk.graphql'],
  schemaPath: './../schema.graphql',
  graphqlConfigFilePath: '../graphql.config.ts',
  codegenConfig: {},
  outputDocuments: true,
  devtools: true,
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

  logOnlyErrors: false,

  clientCache: {
    enabled: true,
  },

  enableFileUploads: true,
}

export default defineNuxtConfig({
  modules: [
    graphqlMiddlewareModule as any,
    '@nuxt/devtools',
    '@nuxt/eslint',
    './modules/playground-module',
  ],
  graphqlMiddleware,
  ssr: true,

  hooks: {
    'nuxt-graphql-middleware:init': (ctx) => {
      ctx.addDocument(
        'queryFromHook',
        `
query queryFromHook {
      users {
        id
      }
    }
`,
      )
    },
  },

  imports: {
    autoImport: false,
  },

  typescript: {
    typeCheck: 'build',
    strict: true,
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-09-14',

  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
})
