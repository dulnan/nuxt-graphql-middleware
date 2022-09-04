import { generate } from '@graphql-codegen/cli'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import * as PluginNuxtGraphqlMiddleware from './codegen/plugin'
import * as PluginNuxtGraphqlMiddlewareDocuments from './codegen/pluginDocuments'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'
import { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import { GraphqlMiddlewareTemplate } from './types'

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
  } else {
    return Promise.resolve(PluginSchemaAst)
  }
}

export interface CodegenResult {
  filename: string
  content: string
}
export function generateSchema(
  url: string,
  dest: string,
): Promise<CodegenResult[]> {
  return generate(
    {
      schema: url,
      pluginLoader,
      generates: {
        [dest]: {
          plugins: ['schema-ast'],
          config: {
            sort: true,
          },
        },
      },
    },
    true,
  )
}

export function generateTemplates(
  documents: string[],
  schemaPath: string,
  config: TypeScriptDocumentsPluginConfig,
): Promise<CodegenResult[]> {
  return generate(
    {
      schema: schemaPath,
      pluginLoader,
      silent: true,
      documents,
      generates: {
        [GraphqlMiddlewareTemplate.OperationTypes]: {
          plugins: ['typescript', 'typescript-operations'],
          config,
        },
        [GraphqlMiddlewareTemplate.ComposableContext]: {
          plugins: ['typescript-nuxt-graphql-middleware'],
        },
        [GraphqlMiddlewareTemplate.Documents]: {
          plugins: ['typescript-nuxt-graphql-middleware-documents'],
        },
      },
    },
    false,
  )
}
