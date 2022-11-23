import {
  Types,
  PluginFunction,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import { GraphQLSchema, concatAST } from 'graphql'
import type { OperationDefinitionNode } from 'graphql'
import { useLogger } from '@nuxt/kit'
import { falsy } from '../helpers'

const logger = useLogger('nuxt-graphql-middleware')

export interface NamedOperationsObjectPluginConfig {}

export const plugin: PluginFunction<
  NamedOperationsObjectPluginConfig,
  string
> = (
  _schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  _config: NamedOperationsObjectPluginConfig,
) => {
  const allAst = concatAST(documents.map((v) => v.document).filter(falsy))

  const operations = {
    query: {} as Record<string, string>,
    mutation: {} as Record<string, string>,
  }

  oldVisit(allAst, {
    enter: {
      OperationDefinition: (node: OperationDefinitionNode) => {
        if (
          node.name?.value &&
          node.loc?.source &&
          (node.operation === 'query' || node.operation === 'mutation')
        ) {
          logger.info(`Added ${node.operation}:`.padEnd(24) + node.name.value)
          operations[node.operation][node.name.value] = node.loc.source.body
        }
      },
    },
  })

  return `const operations = ${JSON.stringify(operations, null, 2)};
export default operations;
`
}
