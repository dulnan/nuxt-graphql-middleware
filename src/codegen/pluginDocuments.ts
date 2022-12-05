import {
  Types,
  PluginFunction,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import { concatAST } from 'graphql'
import type { OperationDefinitionNode, GraphQLSchema } from 'graphql'
import { falsy } from '../runtime/helpers'

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
          operations[node.operation][node.name.value] = node.loc.source.body
        }
      },
    },
  })

  return `const documents = ${JSON.stringify(operations, null, 2)};
export { documents };`
}
