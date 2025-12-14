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
  GetComposableExamplesResponse,
  ComposableExample,
  ImportEntry,
} from '../../../runtime/server/mcp/tools/vue-graphql-composable-example/types'

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

const DESCRIPTION_USE_ASYNC_GRAPHQL_QUERY =
  'useAsyncGraphqlQuery: SSR-compatible, reactive data fetching. Must be called at the root of a component setup or inside another composable. Same limitations as useAsyncData.'

const DESCRIPTION_USE_GRAPHQL_QUERY =
  'useGraphqlQuery: Returns a promise. Can be used anywhere - in components, plugins, other composables, event handlers, or inside useAsyncData.'

const DESCRIPTION_USE_GRAPHQL_MUTATION =
  'useGraphqlMutation: Returns a promise. Can be used anywhere - in components, plugins, other composables, or event handlers.'

const DOCS_URL_USE_ASYNC_GRAPHQL_QUERY =
  'https://nuxt-graphql-middleware.dulnan.net/composables/useAsyncGraphqlQuery.html'

const DOCS_URL_USE_GRAPHQL_QUERY =
  'https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlQuery.html'

const DOCS_URL_USE_GRAPHQL_MUTATION =
  'https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlMutation.html'

/**
 * Generate composable usage examples for an operation.
 */
function generateExamples(
  operationName: string,
  operationType: 'query' | 'mutation',
  variables: Array<{ name: string; type: string; mockValue: string }>,
  variablesTypeName: string,
  responseTypeName: string,
): ComposableExample[] {
  const examples: ComposableExample[] = []

  // Build variables object string
  const hasVariables = variables.length > 0
  const variablesObject = hasVariables
    ? `{ ${variables.map((v) => `${v.name}: ${v.mockValue}`).join(', ')} }`
    : ''

  // Build reactive variables object (indented for inside computed)
  const variablesObjectIndented = hasVariables
    ? `{\n    ${variables.map((v) => `${v.name}: ${v.mockValue}`).join(',\n    ')},\n  }`
    : ''

  if (operationType === 'query') {
    const transformDescription = `// The type of "graphqlResponse.data" is ${responseTypeName}. Prepare the data here before returning it.`
    // useAsyncGraphqlQuery example with reactive variables and transform
    if (hasVariables) {
      examples.push({
        description: DESCRIPTION_USE_ASYNC_GRAPHQL_QUERY,
        documentationUrl: DOCS_URL_USE_ASYNC_GRAPHQL_QUERY,
        code: `import type { ${variablesTypeName} } from '#graphql-operations'

const variables = computed<${variablesTypeName}>(() => {
  return ${variablesObjectIndented}
})

const { data } = await useAsyncGraphqlQuery(
  '${operationName}',
  variables,
  // Same options as useAsyncData.
  {
    transform: function (graphqlResponse) {
      // ${transformDescription}
      return graphqlResponse.data
    },
  },
)

// data is reactive, data.value is ${responseTypeName} | undefined
console.log(data.value)`,
      })
    } else {
      examples.push({
        description: DESCRIPTION_USE_ASYNC_GRAPHQL_QUERY,
        documentationUrl: DOCS_URL_USE_ASYNC_GRAPHQL_QUERY,
        code: `const { data } = await useAsyncGraphqlQuery(
  '${operationName}',
  null,
  // Same options as useAsyncData.
  {
    transform: function (graphqlResponse) {
      // ${transformDescription}
      return graphqlResponse.data
    },
  },
)

// data is reactive, data.value is ${responseTypeName} | undefined
console.log(data.value)`,
      })
    }

    // useGraphqlQuery example (non-async)
    if (hasVariables) {
      examples.push({
        description: DESCRIPTION_USE_GRAPHQL_QUERY,
        documentationUrl: DOCS_URL_USE_GRAPHQL_QUERY,
        code: `const response = await useGraphqlQuery('${operationName}', ${variablesObject})

// response.data is ${responseTypeName} | undefined
console.log(response.data)`,
      })
    } else {
      examples.push({
        description: DESCRIPTION_USE_GRAPHQL_QUERY,
        documentationUrl: DOCS_URL_USE_GRAPHQL_QUERY,
        code: `const response = await useGraphqlQuery('${operationName}')

// response.data is ${responseTypeName} | undefined
console.log(response.data)`,
      })
    }
  } else {
    // Mutation examples
    if (hasVariables) {
      examples.push({
        description: DESCRIPTION_USE_GRAPHQL_MUTATION,
        documentationUrl: DOCS_URL_USE_GRAPHQL_MUTATION,
        code: `const response = await useGraphqlMutation('${operationName}', ${variablesObject})

// response.data is ${responseTypeName} | undefined
console.log(response.data)`,
      })
    } else {
      examples.push({
        description: DESCRIPTION_USE_GRAPHQL_MUTATION,
        documentationUrl: DOCS_URL_USE_GRAPHQL_MUTATION,
        code: `const response = await useGraphqlMutation('${operationName}')

// response.data is ${responseTypeName} | undefined
console.log(response.data)`,
      })
    }
  }

  return examples
}

export function handleGetComposableExamples(
  collector: Collector,
  schema: GraphQLSchema,
  operationName: string,
): GetComposableExamplesResponse {
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
    operation.variablesTypeName,
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
