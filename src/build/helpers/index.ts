import { existsSync } from 'node:fs'
import { useLogger } from '@nuxt/kit'
import type { ConsolaInstance } from 'consola'
import {
  getNamedType,
  isInputObjectType,
  isScalarType,
  OperationTypeNode,
  typeFromAST,
  type GraphQLNamedType,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql'
import type { ModuleOptions } from '../types/options'

// Nuxt >= 4.6 types this as NuxtLogger, but it's still a consola instance.
export const logger = useLogger('nuxt-graphql-middleware') as ConsolaInstance

export const defaultOptions: ModuleOptions = {
  downloadSchema: true,
  schemaPath: '~~/schema.graphql',
  serverApiPrefix: '/api/graphql_middleware',
  graphqlEndpoint: '',
  debug: false,
  includeComposables: true,
  documents: [],
  devtools: true,
  errorOverlay: true,
  logOnlyErrors: true,
  graphqlConfigFilePath: './graphql.config.ts',
  experimental: {
    improvedQueryParamEncoding: false,
  },
  clientCache: {
    enabled: false,
    maxSize: 100,
  },
  fileUploadScalar: 'Upload',
  bodySizeLimit: {
    mutation: 10 * 1024 * 1024,
    upload: 50 * 1024 * 1024,
  },
  mcp: {
    enabled: false,
  },
}

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }
}

/**
 * Determine whether the type is the scalar or an input type that contains it,
 * directly or nested.
 *
 * The visited input types are skipped, as input types can reference each other.
 */
function containsScalar(
  type: GraphQLNamedType,
  scalarName: string,
  visited: Set<string>,
): boolean {
  if (isScalarType(type)) {
    return type.name === scalarName
  } else if (!isInputObjectType(type) || visited.has(type.name)) {
    return false
  }

  visited.add(type.name)
  return Object.values(type.getFields()).some((field) =>
    containsScalar(getNamedType(field.type), scalarName, visited),
  )
}

/**
 * Get the names of the mutations that have a variable of the given scalar,
 * directly or in an input type.
 */
export function getUploadMutations(
  schema: GraphQLSchema,
  operations: readonly { graphqlName: string; node: OperationDefinitionNode }[],
  scalarName: string,
): string[] {
  return operations
    .filter(
      ({ node }) =>
        node.operation === OperationTypeNode.MUTATION &&
        (node.variableDefinitions || []).some((definition) => {
          const type = typeFromAST(schema, definition.type)
          // Each variable needs its own set of visited types: A type visited
          // for another variable may not have been checked completely.
          return (
            !!type &&
            containsScalar(getNamedType(type), scalarName, new Set<string>())
          )
        }),
    )
    .map((operation) => operation.graphqlName)
    .sort()
}

export const fileExists = (
  path?: string,
  extensions = ['js', 'ts', 'mjs'],
): string | null => {
  if (!path) {
    return null
  } else if (existsSync(path)) {
    return path
  }

  const extension = extensions.find((extension) =>
    existsSync(`${path}.${extension}`),
  )

  return extension ? `${path}.${extension}` : null
}
