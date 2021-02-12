import path from 'path'
import { generate } from '@graphql-codegen/cli'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'

const typescriptConfig = {
  exportFragmentSpreadSubTypes: true,
  preResolveTypes: true,
  skipTypeNameForRoot: true,
}

function pluginLoader(name: string): Promise<any> {
  if (name === '@graphql-codegen/typescript') {
    return Promise.resolve(PluginTypescript)
  } else if (name === '@graphql-codegen/typescript-operations') {
    return Promise.resolve(PluginTypescriptOperations)
  } else {
    return Promise.resolve(PluginSchemaAst)
  }
}

export interface GraphqlMiddlewareCodegenConfig {
  enabled?: boolean
  resolvedQueriesPath: string
  schemaOutputPath: string
  typesOutputPath: string
  schemaOptions: any
}

export default function (
  graphqlServer: string,
  options: GraphqlMiddlewareCodegenConfig
) {
  const schemaPath = path.resolve(options.schemaOutputPath, 'schema.graphql')
  function generateSchema() {
    return generate(
      {
        schema: {
          [graphqlServer]: options.schemaOptions,
        },
        pluginLoader,
        generates: {
          [schemaPath]: {
            plugins: [{ 'schema-ast': typescriptConfig }],
            config: typescriptConfig,
          },
          [path.resolve(options.typesOutputPath, 'graphql-schema.d.ts')]: {
            plugins: [{ typescript: typescriptConfig }],
            config: typescriptConfig,
          },
        },
      },
      true
    )
  }

  function generateTypes() {
    const config = {
      ...typescriptConfig,
      onlyOperationTypes: true,
    }
    return generate(
      {
        schema: schemaPath,
        pluginLoader,
        documents: path.resolve(options.resolvedQueriesPath, './*.graphql'),
        generates: {
          [path.resolve(options.typesOutputPath, 'graphql-operations.d.ts')]: {
            plugins: ['typescript', { 'typescript-operations': config }],
            config,
          },
        },
      },
      true
    )
  }

  return { generateSchema, generateTypes }
}
