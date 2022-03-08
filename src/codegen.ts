import path from 'path'
import { generate } from '@graphql-codegen/cli'
import * as PluginTypescript from '@graphql-codegen/typescript'
import * as PluginTypescriptOperations from '@graphql-codegen/typescript-operations'
import * as PluginTypedDocument from '@graphql-codegen/typed-document-node'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'

const typescriptConfig = {
  exportFragmentSpreadSubTypes: true,
  preResolveTypes: true,
  skipTypeNameForRoot: true,
}

function pluginLoader(name: string): Promise<any> {
  if (name === '@graphql-codegen/typescript') {
    return Promise.resolve(PluginTypescript)
  } else if (name === 'typescript-operations') {
    return Promise.resolve(PluginTypescriptOperations)
  } else if (name === 'typed-document-node') {
    return Promise.resolve(PluginTypedDocument)
  } else {
    return Promise.resolve(PluginSchemaAst)
  }
}

export interface GraphqlMiddlewareCodegenConfig {
  enabled?: boolean
  skipSchemaDownload?: boolean
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
    const schema = options.skipSchemaDownload
      ? schemaPath
      : { [graphqlServer]: options.schemaOptions }

    const configSchemaAst = { ...typescriptConfig, sort: true }

    return generate(
      {
        schema,
        pluginLoader,
        generates: {
          [schemaPath]: {
            plugins: [{ 'schema-ast': configSchemaAst }],
            config: configSchemaAst,
          },
          [path.resolve(options.typesOutputPath, 'graphql-schema.ts')]: {
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
      ...(options.schemaOptions || {}),
    }
    return generate(
      {
        schema: schemaPath,
        documents: path.resolve(options.resolvedQueriesPath, './*.graphql'),
        generates: {
          [path.resolve(options.typesOutputPath, 'graphql-operations.ts')]: {
            plugins: [
              'typescript',
              { 'typescript-operations': config },
              'typed-document-node',
            ],
            config,
          },
        },
      },
      true
    )
  }

  return { generateSchema, generateTypes }
}
