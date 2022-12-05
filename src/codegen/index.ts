import { generate, executeCodegen } from '@graphql-codegen/cli'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'
import * as PluginNuxtGraphqlMiddleware from './plugin'
import * as PluginNuxtGraphqlMiddlewareDocuments from './pluginDocuments'
import { GraphqlMiddlewareTemplate } from './../runtime/settings'
import { ModuleOptions } from './../module'

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
  writeToDisk: boolean,
): Promise<CodegenResult> {
  return generate(
    {
      schema: url,
      pluginLoader,
      silent: true,
      errorsOnly: true,
      generates: {
        [dest]: {
          plugins: ['schema-ast'],
          config: {
            sort: true,
          },
        },
      },
    },
    writeToDisk,
  ).then((v) => v[0])
}

export function generateTemplates(
  documents: string[],
  schemaPath: string,
  options: ModuleOptions,
): Promise<CodegenResult[]> {
  return executeCodegen({
    schema: schemaPath,
    pluginLoader,
    silent: true,
    errorsOnly: true,
    documents,
    generates: {
      [GraphqlMiddlewareTemplate.OperationTypes]: {
        plugins: ['typescript', 'typescript-operations'],
        config: options.codegenConfig,
      },
      [GraphqlMiddlewareTemplate.ComposableContext]: {
        plugins: ['typescript-nuxt-graphql-middleware'],
        config: {
          serverApiPrefix: options.serverApiPrefix,
        },
      },
      [GraphqlMiddlewareTemplate.Documents]: {
        plugins: ['typescript-nuxt-graphql-middleware-documents'],
      },
    },
  })
}
