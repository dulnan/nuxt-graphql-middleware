import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule, { type ModuleOptions } from './../src/module'
const IS_DEV = process.env.NODE_ENV === 'development'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: IS_DEV,
  codegenConfig: {},
  outputDocuments: false,
  schemaPath: './../schema.graphql',
  autoInlineFragments: false,
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

  enableFileUploads: false,
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule as any],
  graphqlMiddleware,
  ssr: true,

  extends: ['./layers/test-layer'],

  imports: {
    autoImport: false,
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-09-14',
})
