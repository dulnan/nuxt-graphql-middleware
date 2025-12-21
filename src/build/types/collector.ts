/**
 * Represents a collected GraphQL operation with metadata.
 * Used internally by the Collector - decoupled from MCP tool schemas.
 */
export type CollectorOperation = {
  /** The GraphQL operation name */
  name: string

  /** The type of operation */
  type: 'query' | 'mutation'

  /** Absolute path to the file containing the operation */
  filePath: string

  /** Path to the file relative to the project root */
  relativeFilePath: string

  /** Whether the operation has any variables */
  hasVariables: boolean

  /** Whether the operation requires variables (has non-null variables) */
  needsVariables: boolean

  /** TypeScript type name for the operation variables */
  variablesTypeName: string

  /** TypeScript type name for the operation response */
  responseTypeName: string

  /** The GraphQL source code of just this operation (no fragments) */
  source: string

  /** The full GraphQL source including all fragment dependencies */
  sourceFull: string
}

/**
 * Represents a collected GraphQL fragment with metadata.
 * Used internally by the Collector - decoupled from MCP tool schemas.
 */
export type CollectorFragment = {
  /** The fragment name */
  name: string

  /** The GraphQL type this fragment is defined on */
  typeName: string

  /** Absolute path to the file containing the fragment */
  filePath: string

  /** Path to the file relative to the project root */
  relativeFilePath: string

  /** The GraphQL source code of just this fragment (no dependencies) */
  source: string

  /** The full GraphQL source including all fragment dependencies */
  sourceFull: string

  /** Names of other fragments this fragment depends on */
  dependencies: string[]
}
