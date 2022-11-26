import {
  Types,
  PluginFunction,
  oldVisit,
} from '@graphql-codegen/plugin-helpers'
import { GraphQLSchema, concatAST } from 'graphql'
import type { OperationDefinitionNode } from 'graphql'
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
}

function getCodeResult(
  operations: Record<string, OperationResult>,
  typeName: string,
  serverApiPrefix: string,
): CodeResult {
  const imports: string[] = []
  let code = ''
  let nitroCode = ''
  const names = Object.keys(operations)
  if (names.length) {
    const lines: string[] = []
    const nitroLines: string[] = []

    names.forEach((name) => {
      const nameResult = pascalCase(name + typeName)
      imports.push(nameResult)
      const nameVariables = pascalCase(name + typeName + 'Variables')
      const { hasVariables, variablesOptional } = operations[name]
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
        `    '${serverApiPrefix}/${typeName.toLowerCase()}/${name}': GraphqlMiddlewareResponse<Awaited<${nameResult}>>`,
      )
    })

    code += `  export type GraphqlMiddleware${typeName} = {
${lines.join(',\n')}
  }\n`
    nitroCode += `${nitroLines.join('\n')}`
  }

  return { code, imports, nitroCode }
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

  const resultQuery = getCodeResult(
    operations.query,
    'Query',
    config.serverApiPrefix,
  )
  code += resultQuery.code
  nitroCode += resultQuery.nitroCode
  imports.push(...resultQuery.imports)

  const resultMutation = getCodeResult(
    operations.mutation,
    'Mutation',
    config.serverApiPrefix,
  )
  code += '\n' + resultMutation.code
  nitroCode += '\n' + resultMutation.nitroCode
  imports.push(...resultMutation.imports)

  return `import {
  ${imports.join(',\n  ')}
} from './graphql-operations'\n

type GraphqlMiddlewareResponse<T> = {
  data: T
}

declare module '#build/nuxt-graphql-middleware' {
${code}
}

declare module 'nitropack' {
  type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
  interface InternalApi {
${nitroCode}
  }
}
`
}
