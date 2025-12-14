import {
  parse,
  type VariableDefinitionNode,
  type TypeNode,
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isScalarType,
} from 'graphql'
import type { Collector } from '../../Collector'
import type {
  GetServerUtilExamplesResponse,
  ServerUtilExample,
  ImportEntry,
} from '../../../runtime/server/mcp/tools/nitro-graphql-server-utils-example/types'
import { SERVER_UTILS } from '../../imports'

/**
 * Generate a mock value for a GraphQL type.
 */
function getMockValueForType(typeNode: TypeNode, varName: string): string {
  // Handle NonNull wrapper
  if (typeNode.kind === 'NonNullType') {
    return getMockValueForType(typeNode.type, varName)
  }

  // Handle List wrapper
  if (typeNode.kind === 'ListType') {
    const innerValue = getMockValueForType(typeNode.type, varName)
    return `[${innerValue}]`
  }

  // Handle named types
  if (typeNode.kind === 'NamedType') {
    const typeName = typeNode.name.value

    switch (typeName) {
      case 'String':
        return `'${varName}_value'`
      case 'Int':
        return '1'
      case 'Float':
        return '1.0'
      case 'Boolean':
        return 'true'
      case 'ID':
        return `'${varName}_id'`
      default:
        // For custom types (enums, input objects), return a placeholder
        return `{ /* placeholder for: ${typeName} */ }`
    }
  }

  return `'${varName}'`
}

/**
 * Format a GraphQL type node to a readable string.
 */
function formatType(typeNode: TypeNode): string {
  if (typeNode.kind === 'NonNullType') {
    return `${formatType(typeNode.type)}!`
  }
  if (typeNode.kind === 'ListType') {
    return `[${formatType(typeNode.type)}]`
  }
  if (typeNode.kind === 'NamedType') {
    return typeNode.name.value
  }
  return 'unknown'
}

/**
 * Extract the base type name from a TypeNode (unwrapping NonNull and List).
 */
function getBaseTypeName(typeNode: TypeNode): string | null {
  if (typeNode.kind === 'NonNullType') {
    return getBaseTypeName(typeNode.type)
  }
  if (typeNode.kind === 'ListType') {
    return getBaseTypeName(typeNode.type)
  }
  if (typeNode.kind === 'NamedType') {
    return typeNode.name.value
  }
  return null
}

/**
 * Extract variables from a GraphQL operation source.
 */
function extractVariables(
  source: string,
): Array<{ name: string; type: string; mockValue: string }> {
  try {
    const doc = parse(source)
    const operation = doc.definitions.find(
      (def) => def.kind === 'OperationDefinition',
    )

    if (!operation || operation.kind !== 'OperationDefinition') {
      return []
    }

    const variables = operation.variableDefinitions || []
    return variables.map((varDef: VariableDefinitionNode) => ({
      name: varDef.variable.name.value,
      type: formatType(varDef.type),
      mockValue: getMockValueForType(varDef.type, varDef.variable.name.value),
    }))
  } catch {
    return []
  }
}

/**
 * Extract all custom type names used in variable definitions.
 */
function extractVariableTypeNames(source: string): string[] {
  try {
    const doc = parse(source)
    const operation = doc.definitions.find(
      (def) => def.kind === 'OperationDefinition',
    )

    if (!operation || operation.kind !== 'OperationDefinition') {
      return []
    }

    const typeNames = new Set<string>()
    const variables = operation.variableDefinitions || []

    for (const varDef of variables) {
      const typeName = getBaseTypeName(varDef.type)
      if (typeName) {
        typeNames.add(typeName)
      }
    }

    return Array.from(typeNames)
  } catch {
    return []
  }
}

/**
 * Build the imports array for an operation.
 */
function buildImports(
  schema: GraphQLSchema,
  variablesTypeName: string,
  responseTypeName: string,
  variableTypeNames: string[],
  hasVariables: boolean,
): ImportEntry[] {
  const imports: ImportEntry[] = []

  // Always add the response type
  imports.push({
    typeName: responseTypeName,
    description: 'Response type for the operation',
  })

  // Add variables type if the operation has variables
  if (hasVariables) {
    imports.push({
      typeName: variablesTypeName,
      description: 'Variables type for the operation',
    })
  }

  // Check each variable type in the schema
  for (const typeName of variableTypeNames) {
    const schemaType = schema.getType(typeName)
    if (!schemaType) continue

    // Skip scalar types (String, Int, Boolean, etc.)
    if (isScalarType(schemaType)) continue

    if (isEnumType(schemaType)) {
      imports.push({
        typeName,
        description: `Enum type used in variables`,
      })
    } else if (isInputObjectType(schemaType)) {
      imports.push({
        typeName,
        description: `Input object type used in variables`,
      })
    }
  }

  return imports
}

/**
 * Generate server util usage examples for an operation.
 */
function generateExamples(
  operationName: string,
  operationType: 'query' | 'mutation',
  variables: Array<{ name: string; type: string; mockValue: string }>,
  responseTypeName: string,
): ServerUtilExample[] {
  const examples: ServerUtilExample[] = []

  // Build variables object string
  const hasVariables = variables.length > 0
  const variablesObject = hasVariables
    ? `{ ${variables.map((v) => `${v.name}: ${v.mockValue}`).join(', ')} }`
    : ''

  if (operationType === 'query') {
    // useGraphqlQuery example for queries
    if (hasVariables) {
      examples.push({
        description: SERVER_UTILS.useGraphqlQuery.description,
        documentationUrl: SERVER_UTILS.useGraphqlQuery.docsUrl,
        code: `export default defineEventHandler(async (event) => {
  const response = await useGraphqlQuery('${operationName}', ${variablesObject})

  // response.data is ${responseTypeName} | undefined
  return response.data
})`,
      })
    } else {
      examples.push({
        description: SERVER_UTILS.useGraphqlQuery.description,
        documentationUrl: SERVER_UTILS.useGraphqlQuery.docsUrl,
        code: `export default defineEventHandler(async (event) => {
  const response = await useGraphqlQuery('${operationName}')

  // response.data is ${responseTypeName} | undefined
  return response.data
})`,
      })
    }
  } else {
    // useGraphqlMutation example for mutations
    if (hasVariables) {
      examples.push({
        description: SERVER_UTILS.useGraphqlMutation.description,
        documentationUrl: SERVER_UTILS.useGraphqlMutation.docsUrl,
        code: `export default defineEventHandler(async (event) => {
  const response = await useGraphqlMutation('${operationName}', ${variablesObject})

  // response.data is ${responseTypeName} | undefined
  return response.data
})`,
      })
    } else {
      examples.push({
        description: SERVER_UTILS.useGraphqlMutation.description,
        documentationUrl: SERVER_UTILS.useGraphqlMutation.docsUrl,
        code: `export default defineEventHandler(async (event) => {
  const response = await useGraphqlMutation('${operationName}')

  // response.data is ${responseTypeName} | undefined
  return response.data
})`,
      })
    }
  }

  // Add doGraphqlRequest example (works for both queries and mutations)
  examples.push({
    description: SERVER_UTILS.doGraphqlRequest.description,
    documentationUrl: SERVER_UTILS.doGraphqlRequest.docsUrl,
    code: `export default defineEventHandler(async (event) => {
  // Use doGraphqlRequest for raw GraphQL requests with custom query strings
  const response = await doGraphqlRequest({
    query: \`
      ${operationType} ${operationName}${hasVariables ? `(${variables.map((v) => `$${v.name}: ${v.type}`).join(', ')})` : ''} {
        # Your query fields here
      }
    \`,${hasVariables ? `\n    variables: ${variablesObject},` : ''}
    operationName: '${operationName}',
  })

  return response.data
})`,
  })

  return examples
}

export function handleGetServerUtilsExamples(
  collector: Collector,
  schema: GraphQLSchema,
  operationName: string,
): GetServerUtilExamplesResponse {
  const operations = collector.getOperations()
  const operation = operations.find((op) => op.name === operationName)

  if (!operation) {
    return { error: `Operation "${operationName}" not found` }
  }

  const variables = extractVariables(operation.source)
  const variableTypeNames = extractVariableTypeNames(operation.source)

  const examples = generateExamples(
    operationName,
    operation.type,
    variables,
    operation.responseTypeName,
  )

  const imports = buildImports(
    schema,
    operation.variablesTypeName,
    operation.responseTypeName,
    variableTypeNames,
    variables.length > 0,
  )

  return { examples, imports }
}
