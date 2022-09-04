import { generate } from '@graphql-codegen/cli'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import * as PluginNuxtGraphqlMiddleware from './codegen/plugin'
import * as PluginNuxtGraphqlMiddlewareDocuments from './codegen/pluginDocuments'

function pluginLoader(name: string): Promise<any> {
  if (name === '@graphql-codegen/typescript') {
    return Promise.resolve(PluginTypescript)
  } else if (name === '@graphql-codegen/typescript-operations') {
    return Promise.resolve(PluginTypescriptOperations)
  } else if (name === '@graphql-codegen/typescript-nuxt-graphql-middleware') {
    return Promise.resolve(PluginNuxtGraphqlMiddleware)
  } else if (
    name === '@graphql-codegen/typescript-nuxt-graphql-middleware-documents'
  ) {
    return Promise.resolve(PluginNuxtGraphqlMiddlewareDocuments)
  }
}

export interface CodegenResult {
  filename: string
  content: string
}

export async function generateTemplates(
  documents: string[],
  config: TypeScriptDocumentsPluginConfig,
): Promise<CodegenResult[]> {
  return await generate(
    {
      schema: './schema.graphql',
      pluginLoader,
      silent: true,
      documents,
      generates: {
        'graphql-operations.d.ts': {
          plugins: ['typescript', 'typescript-operations'],
          config,
        },
        'nuxt-graphql-middleware.d.ts': {
          plugins: ['typescript-nuxt-graphql-middleware'],
        },
        'graphql-documents.mjs': {
          plugins: ['typescript-nuxt-graphql-middleware-documents'],
        },
      },
    },
    false,
  )
}
