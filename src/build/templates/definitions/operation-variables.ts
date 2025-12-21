import { defineGeneratorTemplate } from './../defineTemplate'
import type { OperationDefinitionNode } from 'graphql'

/**
 * Returns information about a query operation's variables.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/operation-variables', context: 'nitro' },
  (output) => {
    const operations = output
      .getCollectedOperations()
      .reduce<Record<string, string[]>>((acc, collectedOperation) => {
        const node: OperationDefinitionNode = collectedOperation.node
        const operationName = collectedOperation.graphqlName
        const variables = (node.variableDefinitions || [])
          .map((v) => v.variable.name.value)
          .sort()
        acc[operationName] = variables
        return acc
      }, {})

    return `export const operationVariables = ${JSON.stringify(operations, null, 2)}`
  },
  () => {
    return `
export declare const operationVariables: Record<string, string[]>
`
  },
)
