import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule from './../src/module'
import type { ModuleOptions } from '../src/build/types/options'
const IS_DEV = process.env.NODE_ENV === 'development'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: IS_DEV,
  autoImportPatterns: ['~/**/*.{graphql,gql}', '!queryFromDisk.graphql'],
  schemaPath: './../schema.graphql',
  graphqlConfigFilePath: '../graphql.config.ts',
  codegenConfig: {},
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

  experimental: {
    improvedQueryParamEncoding: true,
    subscriptions: true,
  },
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
    'nuxt-graphql-middleware:build': (ctx) => {
      const fragments = ctx.output.getFragments()
      fragments.forEach((v) => {
        console.log(v.node.name.value)
      })
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
    build: {
      minify: false,
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
})
