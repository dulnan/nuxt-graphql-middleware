import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule, { ModuleOptions } from './../src/module'

const graphqlMiddleware: ModuleOptions = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: true,
  codegenConfig: {},
  outputDocuments: true,
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
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule],
  graphqlMiddleware,
} as any)
