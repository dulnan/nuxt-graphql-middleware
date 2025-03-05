import { generate } from '@graphql-codegen/cli'
import { type Types } from '@graphql-codegen/plugin-helpers'
import { type SchemaASTConfig } from '@graphql-codegen/schema-ast'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'
import { type ModuleOptions } from './../module'

/**
 * Loads the correct plugin for graphql-codegen.
 */
export function pluginLoader(name: string): Promise<any> {
  switch (name) {
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
