import { generate, executeCodegen } from '@graphql-codegen/cli'
import { Types } from '@graphql-codegen/plugin-helpers'
import { SchemaASTConfig } from '@graphql-codegen/schema-ast'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'
import * as PluginNuxtGraphqlMiddleware from './plugin'
import * as PluginNuxtGraphqlMiddlewareDocuments from './pluginDocuments'
import { GraphqlMiddlewareTemplate } from './../runtime/settings'
import { ModuleOptions } from './../module'

/**
 * Loads the correct plugin for graphql-codegen.
 */
export function pluginLoader(name: string): Promise<any> {
  switch (name) {
    case '@graphql-codegen/typescript':
      return Promise.resolve(PluginTypescript)

    case '@graphql-codegen/typescript-operations':
      return Promise.resolve(PluginTypescriptOperations)

    case '@graphql-codegen/typescript-nuxt-graphql-middleware':
      return Promise.resolve(PluginNuxtGraphqlMiddleware)

    case '@graphql-codegen/typescript-nuxt-graphql-middleware-documents':
      return Promise.resolve(PluginNuxtGraphqlMiddlewareDocuments)

    case '@graphql-codegen/schema-ast':
      return Promise.resolve(PluginSchemaAst)
  }

  throw new Error(`graphql-codegen plugin not found: ${name}`)
}

export interface CodegenResult {
  /*
   * The name of the generated file.
   */
  filename: string

  /**
   * The content of the generated file.
   */
  content: string
}

/**
 * Generates the schema.
 */
export function generateSchema(
  moduleOptions: ModuleOptions,
  dest: string,
  writeToDisk: boolean,
): Promise<CodegenResult> {
  const pluginConfig: Types.UrlSchemaOptions | undefined =
    moduleOptions.codegenSchemaConfig?.urlSchemaOptions

  const schemaAstConfig: SchemaASTConfig = moduleOptions.codegenSchemaConfig
    ?.schemaAstConfig || {
    sort: true,
  }

  const config: Types.Config & {
    cwd?: string
  } = {
    schema: moduleOptions.graphqlEndpoint,
    pluginLoader,
    silent: true,
    errorsOnly: true,
    config: pluginConfig,

    generates: {
      [dest]: {
        plugins: ['schema-ast'],
        config: schemaAstConfig,
      },
    },
  }
  return generate(config, writeToDisk).then((v) => v[0])
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
