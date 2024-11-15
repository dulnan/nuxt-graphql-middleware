import {
  type Types,
  type PluginFunction,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import { concatAST } from 'graphql'
import type { OperationDefinitionNode, GraphQLSchema } from 'graphql'
import { pascalCase } from 'change-case-all'
import { falsy } from '../runtime/helpers'

export interface PluginConfig {
  serverApiPrefix: string
}

interface OperationResult {
  hasVariables: boolean
  variablesOptional: boolean
}

interface CodeResult {
  code: string
  nitroCode: string
  imports: string[]
  resultTypes: string[]
}

function getCodeResult(
  operations: Record<string, OperationResult>,
  typeName: string,
  serverApiPrefix: string,
): CodeResult {
  const imports: string[] = []
  const resultTypes: string[] = []
  let code = ''
  let nitroCode = ''
  const names = Object.keys(operations)
  if (names.length) {
    const lines: string[] = []
    const nitroLines: string[] = []

    names.forEach((name) => {
      const nameResult = pascalCase(name + typeName)
      resultTypes.push(nameResult)
      imports.push(nameResult)
      const nameVariables = pascalCase(name + typeName + 'Variables')
      const { hasVariables, variablesOptional } = operations[name]!
      if (hasVariables) {
        imports.push(nameVariables)
      }
      const variablesType = hasVariables ? nameVariables : 'null'
      lines.push(
        `    ${name}: [${variablesType}, ${
          variablesOptional ? 'true' : 'false'
        }, ${nameResult}]`,
      )
      nitroLines.push(
        `    '${serverApiPrefix}/${typeName.toLowerCase()}/${name}': {
      'default': GraphqlResponse<${nameResult}>
    }`,
      )
    })

    code += `  export type GraphqlMiddleware${typeName} = {
${lines.join(',\n')}
  }\n`
    nitroCode += `${nitroLines.join('\n')}`
  }

  return { code, imports, nitroCode, resultTypes }
}

export const plugin: PluginFunction<PluginConfig, string> = (
  _schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: PluginConfig,
) => {
  const allAst = concatAST(documents.map((v) => v.document).filter(falsy))

  const operations: Record<
    'query' | 'mutation',
    Record<string, OperationResult>
  > = {
    query: {},
    mutation: {},
  }

  oldVisit(allAst, {
    enter: {
      OperationDefinition: (node: OperationDefinitionNode) => {
        if (
          'name' in node &&
          node.name?.value &&
          'operation' in node &&
          (node.operation === 'query' || node.operation === 'mutation')
        ) {
          operations[node.operation][node.name.value] = {
            hasVariables: !!node.variableDefinitions?.length,
            variablesOptional: !!node.variableDefinitions?.every((v: any) => {
              return v.defaultValue
            }),
          }
        }
      },
    },
  })

  let code = ''
  let nitroCode = ''
  const imports: string[] = []
  const resultTypes: string[] = []

  const resultQuery = getCodeResult(
    operations.query,
    'Query',
    config.serverApiPrefix,
  )
  code += resultQuery.code
  nitroCode += resultQuery.nitroCode
  imports.push(...resultQuery.imports)
  resultTypes.push(...resultQuery.resultTypes)

  const resultMutation = getCodeResult(
    operations.mutation,
    'Mutation',
    config.serverApiPrefix,
  )
  code += '\n' + resultMutation.code
  nitroCode += '\n' + resultMutation.nitroCode
  imports.push(...resultMutation.imports)
  resultTypes.push(...resultMutation.resultTypes)

  return `
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type {
  ${imports.join(',\n  ')}
} from './../graphql-operations'\n

declare module '#nuxt-graphql-middleware/generated-types' {
  export type GraphqlMiddlewareResponseUnion = ${resultTypes.join(' | ')}
${code}
}

declare module 'nitropack' {
  interface InternalApi {
${nitroCode}
  }
}
`
}
