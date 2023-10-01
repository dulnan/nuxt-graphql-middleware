import {
  Types,
  PluginFunction,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import { concatAST, parse, visit, print, Kind } from 'graphql'
import type {
  OperationDefinitionNode,
  FragmentDefinitionNode,
  GraphQLSchema,
  DocumentNode,
} from 'graphql'
import { falsy } from '../runtime/helpers'

export interface NamedOperationsObjectPluginConfig {}

/**
 * Parses the given document body, removes all operations except the one given
 * as the second argument and removes all fragments not used by the operation.
 */
function cleanGraphqlDocument(
  graphqlContent: string,
  operationName: string,
): DocumentNode {
  const document = parse(graphqlContent)

  let selectedOperation: OperationDefinitionNode | null = null
  const fragments: { [key: string]: FragmentDefinitionNode } = {}
  const usedFragments: Set<string> = new Set()

  // Find the desired operation and gather all fragment definitions
  visit(document, {
    OperationDefinition(node) {
      if (node.name?.value === operationName) {
        selectedOperation = node
      }
    },
    FragmentDefinition(node) {
      fragments[node.name.value] = node
    },
  })

  if (!selectedOperation) {
    throw new Error(`Operation named "${operationName}" not found`)
  }

  // Find fragments used by the selected operation
  visit(selectedOperation, {
    FragmentSpread(node) {
      usedFragments.add(node.name.value)
    },
  })

  // If a fragment uses another fragment, we need to add it to the usedFragments set
  let hasNewFragments = true
  while (hasNewFragments) {
    hasNewFragments = false
    for (const fragmentName of usedFragments) {
      visit(fragments[fragmentName], {
        FragmentSpread(node) {
          if (!usedFragments.has(node.name.value)) {
            usedFragments.add(node.name.value)
            hasNewFragments = true
          }
        },
      })
    }
  }

  // Construct the cleaned GraphQL document
  return {
    kind: Kind.DOCUMENT,
    definitions: [
      selectedOperation,
      ...Array.from(usedFragments).map(
        (fragmentName) => fragments[fragmentName],
      ),
    ],
  }
}

export const plugin: PluginFunction<
  NamedOperationsObjectPluginConfig,
  string
> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  _config: NamedOperationsObjectPluginConfig,
) => {
  const allAst = concatAST(documents.map((v) => v.document).filter(falsy))

  const operations = {
    query: {} as Record<string, string>,
    mutation: {} as Record<string, string>,
  }
  let hasErrors = false

  oldVisit(allAst, {
    enter: {
      OperationDefinition: (node: OperationDefinitionNode) => {
        if (
          node.name?.value &&
          node.loc?.source &&
          (node.operation === 'query' || node.operation === 'mutation')
        ) {
          const cleaned = cleanGraphqlDocument(
            node.loc.source.body,
            node.name.value,
          )
          const errors = validateGraphQlDocuments(schema, [cleaned])
          if (errors.length) {
            console.log(node.name.value + ': ' + node.operation)
            hasErrors = true
            errors.forEach((v) => console.log(v))
          } else {
            operations[node.operation][node.name.value] = print(cleaned)
          }
        }
      },
    },
  })

  if (hasErrors) {
    throw new Error('Failed to generate documents.')
  }

  return `const documents = ${JSON.stringify(operations, null, 2)};
export { documents };`
}
