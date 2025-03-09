import {
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
} from 'graphql'

export type CollectedOperation = {
  /** e.g. "MyQuery" */
  name: string
  /** e.g. "query", "mutation", or "subscription" */
  operationType: 'query' | 'mutation' | 'subscription'
  /** True if there are any variable definitions */
  hasVariables: boolean
  /** True if *all* variables have a default (thus are optional) */
  variablesOptional: boolean
  /** The original node in the AST */
  node: OperationDefinitionNode

  source: string
}

export type CollectedFragment = {
  name: string
  node: FragmentDefinitionNode
  source: string
}

export type ModuleContext = {
  isDev: boolean
  patterns: string[]
  srcDir: string
  rootDir: string
  buildDir: string
  schemaPath: string
  serverApiPrefix: string
  logOnlyErrors: boolean
  nuxtConfigPath: string

  /**
   * The build-relative path to the runtime types.
   */
  runtimeTypesPath: string
}
