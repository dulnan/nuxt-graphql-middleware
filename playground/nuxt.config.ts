import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'url'
import graphqlMiddlewareModule from './../src/module'
import type { ModuleOptions } from '../src/module/types/options'
const IS_DEV = process.env.NODE_ENV === 'development'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: IS_DEV,
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
  modules: [graphqlMiddlewareModule as any, '@nuxt/devtools', '@nuxt/eslint'],
  graphqlMiddleware,
  ssr: true,

  imports: {
    autoImport: false,
  },

  typescript: {
    typeCheck: 'build',
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
