import type { GeneratorOutputOperation } from '~/src/deluxe'
import { pascalCase } from 'change-case-all'

type CodeResult = {
  code: string
  nitroCode: string
  imports: string[]
  resultTypes: string[]
}

type OperationMetadata = {
  [operationName: string]: {
    hasVariables: boolean
    variablesOptional: boolean
  }
}

interface GroupedOperations {
  query: OperationMetadata
  mutation: OperationMetadata
  subscription: OperationMetadata
}

function groupOperationsByType(
  ops: GeneratorOutputOperation[],
): GroupedOperations {
  const result: GroupedOperations = {
    query: {},
    mutation: {},
    subscription: {},
  }

  for (const op of ops) {
    // Put it in the right bucket
    result[op.operationType][op.graphqlName] = {
      hasVariables: op.hasVariables,
      variablesOptional: !op.needsVariables,
    }
  }

  return result
}

/**
 * For a given set of operations (e.g. "Query" or "Mutation" bucket),
 * produce the code snippet with metadata about their variables, etc.
 */
function buildOperationTypeCode(
  operationMetadata: OperationMetadata,
  typeName: string,
  serverApiPrefix: string,
): CodeResult {
  const imports: string[] = []
  const resultTypes: string[] = []
  let code = ''
  let nitroCode = ''

  const operationNames = Object.keys(operationMetadata)
  if (operationNames.length === 0) {
    return { code, nitroCode, imports, resultTypes }
  }

  const lines: string[] = []
  const nitroLines: string[] = []

  for (const name of operationNames) {
    // The "PascalCase" or any naming scheme you like
    const nameResult = pascalCase(`${name}${typeName}`)
    const nameVariables = pascalCase(`${name}${typeName}Variables`)

    // Keep track so we can import them from your `graphql-operations` file, etc.
    resultTypes.push(nameResult)
    imports.push(nameResult)

    const { hasVariables, variablesOptional } = operationMetadata[name]
    if (hasVariables) {
      imports.push(nameVariables)
    }

    const variablesType = hasVariables ? nameVariables : 'null'
    lines.push(
      `    ${name}: [${variablesType}, ${
        variablesOptional ? 'true' : 'false'
      }, ${nameResult}]`,
    )

    // If you still want to generate "nitroCode" blocks or something similar:
    nitroLines.push(`
    '${serverApiPrefix}/${typeName.toLowerCase()}/${name}': {
      'default': GraphqlResponse<${nameResult}>
    }`)
  }

  code += `  export type GraphqlMiddleware${typeName} = {\n${lines.join(',\n')}\n  }\n`
  nitroCode += nitroLines.join('\n')

  return { code, nitroCode, imports, resultTypes }
}

export function generateContextTemplate(
  collectedOperations: GeneratorOutputOperation[],
  serverApiPrefix: string,
): string {
  // Group ops by operationType
  const grouped = groupOperationsByType(collectedOperations)

  // Build code results for each operation kind
  const queryResult = buildOperationTypeCode(
    grouped.query,
    'Query',
    serverApiPrefix,
  )
  const mutationResult = buildOperationTypeCode(
    grouped.mutation,
    'Mutation',
    serverApiPrefix,
  )
  const subscriptionResult = buildOperationTypeCode(
    grouped.subscription,
    'Subscription',
    serverApiPrefix,
  )

  // Accumulate them
  const allImports = [
    ...queryResult.imports,
    ...mutationResult.imports,
    ...subscriptionResult.imports,
  ]
  const allResultTypes = [
    ...queryResult.resultTypes,
    ...mutationResult.resultTypes,
    ...subscriptionResult.resultTypes,
  ]
  const combinedCode = [
    queryResult.code,
    mutationResult.code,
    subscriptionResult.code,
  ].join('\n')
  const combinedNitroCode = [
    queryResult.nitroCode,
    mutationResult.nitroCode,
    subscriptionResult.nitroCode,
  ].join('\n')

  return `
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type {
  ${allImports.join(',\n  ')}
} from './../graphql-operations'

declare module '#nuxt-graphql-middleware/generated-types' {
  export type GraphqlMiddlewareResponseUnion = ${allResultTypes.join(' | ')}
${combinedCode}
}

declare module 'nitropack' {
  interface InternalApi {
${combinedNitroCode}
  }
}
`
}
