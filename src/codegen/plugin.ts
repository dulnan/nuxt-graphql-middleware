import {
  Types,
  PluginFunction,
  oldVisit
} from '@graphql-codegen/plugin-helpers'
import { GraphQLSchema, concatAST } from 'graphql'
import { pascalCase } from 'change-case-all'

export interface NamedOperationsObjectPluginConfig {
  /**
   * @description Allow you to customize the name of the exported identifier
   * @default namedOperations
   *
   * @exampleMarkdown
   * ```yaml
   * generates:
   *   path/to/file.ts:
   *     plugins:
   *       - typescript
   *       - named-operations-object
   *     config:
   *       identifierName: ListAllOperations
   * ```
   */
  identifierName?: string
  /**
   * @description Will generate a const string instead of regular string.
   * @default false
   */
  useConsts?: boolean
}

interface OperationResult {
  hasVariables: boolean
  variablesOptional: boolean
}

interface CodeResult {
  code: string
  imports: string[]
}

function getCodeResult (
  operations: Record<string, OperationResult>,
  typeName: string
): CodeResult {
  const imports: string[] = []
  let code = ''
  const names = Object.keys(operations)
  if (names.length) {
    const queryVariablesType = names
      .map((name) => {
        const nameResult = pascalCase(name + typeName)
        imports.push(nameResult)
        const nameVariables = pascalCase(name + typeName + 'Variables')
        const { hasVariables, variablesOptional } = operations[name]
        if (hasVariables) {
          imports.push(nameVariables)
        }
        const variablesType = hasVariables ? nameVariables : 'null'
        return `${name}: [${variablesType}, ${
          variablesOptional ? 'true' : 'false'
        }, ${nameResult}]`
      })
      .join(',\n')

    code += `
export type GraphqlMiddleware${typeName} = {
  ${queryVariablesType}
}
`
  }

  return { code, imports }
}

export const plugin: PluginFunction<
  NamedOperationsObjectPluginConfig,
  string
> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: NamedOperationsObjectPluginConfig
) => {
  const allAst = concatAST(documents.map(v => v.document))

  const operations: Record<
    'query' | 'mutation',
    Record<string, OperationResult>
  > = {
    query: {},
    mutation: {}
  }

  oldVisit(allAst, {
    enter: {
      OperationDefinition: (node) => {
        if (
          node.name?.value &&
          (node.operation === 'query' || node.operation === 'mutation')
        ) {
          operations[node.operation][node.name.value] = {
            hasVariables: node.variableDefinitions.length > 0,
            variablesOptional: node.variableDefinitions.every((v: any) => {
              return v.defaultValue
            })
          }
        }
      }
    }
  })

  let code = ''
  const imports: string[] = []

  const resultQuery = getCodeResult(operations.query, 'Query')
  code += resultQuery.code
  imports.push(...resultQuery.imports)

  const resultMutation = getCodeResult(operations.mutation, 'Mutation')
  code += resultMutation.code
  imports.push(...resultMutation.imports)

  return `
import { ${imports.join(', ')} } from './graphql-operations'\n\n
declare module '#build/nuxt-graphql-middleware' {
  ${code}
}`
}
