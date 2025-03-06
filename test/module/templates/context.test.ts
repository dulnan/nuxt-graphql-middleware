import { describe, it, expect } from 'vitest'
import type { GeneratorOutputOperation } from 'graphql-typescript-deluxe'
import {
  groupOperationsByType,
  buildOperationTypeCode,
  generateContextTemplate,
} from './../../../src/module/templates/context'

// Mock classes / types to help create test data if needed
enum OperationTypeNode {
  QUERY = 'query',
  MUTATION = 'mutation',
  SUBSCRIPTION = 'subscription',
}

/**
 * Helper to create a mock GeneratorOutputOperation
 */
function createMockOperation(
  partial: Partial<GeneratorOutputOperation>,
): GeneratorOutputOperation {
  // Return an object with sensible defaults, merged with partial overrides
  return {
    operationType: OperationTypeNode.QUERY,
    graphqlName: 'DefaultGraphqlName',
    typeName: 'DefaultTypeName',
    variablesTypeName: 'DefaultVariablesTypeName',
    hasVariables: false,
    needsVariables: false,
    filePath: '/path/to/default.ts',
    timestamp: Date.now(),
    getDependencies: () => [], // from DependencyAware
    getGraphQLFragmentDependencies: () => [],
    getTypeScriptEnumDependencies: () => [],
    ...partial,
  } as GeneratorOutputOperation
}

describe('groupOperationsByType', () => {
  it('should return an empty GroupedOperations object if no operations are passed', () => {
    const grouped = groupOperationsByType([])
    expect(grouped).toEqual({
      query: {},
      mutation: {},
      subscription: {},
    })
  })

  it('should correctly group operations by their operationType', () => {
    const ops: GeneratorOutputOperation[] = [
      createMockOperation({
        operationType: OperationTypeNode.QUERY,
        graphqlName: 'GetUser',
        hasVariables: true,
        needsVariables: true,
      }),
      createMockOperation({
        operationType: OperationTypeNode.MUTATION,
        graphqlName: 'UpdateUser',
      }),
      createMockOperation({
        operationType: OperationTypeNode.SUBSCRIPTION,
        graphqlName: 'OnUserCreated',
      }),
    ]

    const grouped = groupOperationsByType(ops)

    expect(grouped.query).toEqual({
      GetUser: {
        hasVariables: true,
        variablesOptional: false,
      },
    })
    expect(grouped.mutation).toEqual({
      UpdateUser: {
        hasVariables: false,
        variablesOptional: true,
      },
    })
    expect(grouped.subscription).toEqual({
      OnUserCreated: {
        hasVariables: false,
        variablesOptional: true,
      },
    })
  })

  it('should handle multiple operations of the same type', () => {
    const ops: GeneratorOutputOperation[] = [
      createMockOperation({
        operationType: OperationTypeNode.QUERY,
        graphqlName: 'GetUser',
      }),
      createMockOperation({
        operationType: OperationTypeNode.QUERY,
        graphqlName: 'GetPosts',
        hasVariables: true,
        needsVariables: false,
      }),
    ]

    const grouped = groupOperationsByType(ops)
    expect(grouped.query).toEqual({
      GetUser: {
        hasVariables: false,
        variablesOptional: true,
      },
      GetPosts: {
        hasVariables: true,
        variablesOptional: true,
      },
    })
  })
})

describe('buildOperationTypeCode', () => {
  it('should return empty code, nitroCode, imports, and resultTypes when no operations exist', () => {
    const operationMetadata = {}
    const result = buildOperationTypeCode(operationMetadata, 'Query', '/api')
    expect(result.code).toBe('')
    expect(result.nitroCode).toBe('')
    expect(result.imports).toEqual([])
    expect(result.resultTypes).toEqual([])
  })

  it('should build code for operations with variables', () => {
    const operationMetadata = {
      GetUser: { hasVariables: true, variablesOptional: false },
      GetPosts: { hasVariables: true, variablesOptional: true },
    }

    // We expect the code to reference the PascalCase version of these names
    const result = buildOperationTypeCode(operationMetadata, 'Query', '/api')

    // Verify the generated code
    expect(result.code).toContain('export type GraphqlMiddlewareQuery = {')
    expect(result.code).toContain(
      'GetUser: [GetUserQueryVariables, false, GetUserQuery]',
    )
    expect(result.code).toContain(
      'GetPosts: [GetPostsQueryVariables, true, GetPostsQuery]',
    )

    // Verify the nitroCode has lines for each operation
    expect(result.nitroCode).toContain(
      "'default': GraphqlResponse<GetUserQuery>",
    )
    expect(result.nitroCode).toContain(
      "'default': GraphqlResponse<GetPostsQuery>",
    )

    // Imports should reference the Query types
    expect(result.imports).toEqual([
      'GetUserQuery',
      'GetUserQueryVariables',
      'GetPostsQuery',
      'GetPostsQueryVariables',
    ])

    // Result types should be the PascalCase base operation names
    expect(result.resultTypes).toEqual(['GetUserQuery', 'GetPostsQuery'])
  })

  it('should build code for operations without variables', () => {
    const operationMetadata = {
      Ping: { hasVariables: false, variablesOptional: true },
    }
    const result = buildOperationTypeCode(operationMetadata, 'Query', '/api')

    expect(result.code).toContain('Ping: [null, true, PingQuery]')
    expect(result.imports).toEqual(['PingQuery'])
    expect(result.resultTypes).toEqual(['PingQuery'])
  })
})

describe('generateContextTemplate', () => {
  it('should generate the complete context template for all operation types', () => {
    const mockOps: GeneratorOutputOperation[] = [
      createMockOperation({
        operationType: OperationTypeNode.QUERY,
        graphqlName: 'GetUser',
        hasVariables: true,
        needsVariables: false,
      }),
      createMockOperation({
        operationType: OperationTypeNode.MUTATION,
        graphqlName: 'UpdateUser',
        hasVariables: true,
        needsVariables: true,
      }),
      createMockOperation({
        operationType: OperationTypeNode.SUBSCRIPTION,
        graphqlName: 'OnUserStatus',
        hasVariables: false,
        needsVariables: false,
      }),
    ]

    const result = generateContextTemplate(mockOps, '/api')

    // Since this can get quite large, you can do partial string checks:
    // Check for the import lines
    expect(result).toContain('GetUserQuery')
    expect(result).toContain('GetUserQueryVariables')
    expect(result).toContain('UpdateUserMutation')
    expect(result).toContain('UpdateUserMutationVariables')
    expect(result).toContain('OnUserStatusSubscription')

    // Check code blocks
    expect(result).toContain('export type GraphqlMiddlewareQuery')
    expect(result).toContain('export type GraphqlMiddlewareMutation')
    expect(result).toContain('export type GraphqlMiddlewareSubscription')

    // Check the "nitropack" block
    expect(result).toContain('interface InternalApi')

    // Optionally, check for your serverApiPrefix usage
    expect(result).toContain('/api/query/GetUser')
    expect(result).toContain('/api/mutation/UpdateUser')
    expect(result).toContain('/api/subscription/OnUserStatus')
  })

  it('should handle an empty array of collectedOperations without throwing errors', () => {
    const result = generateContextTemplate([], '/api')

    // The template should still produce valid code, but with no operations
    expect(result).toContain('declare module')
    expect(result).not.toContain('GraphqlMiddlewareQuery')
    expect(result).not.toContain('GraphqlMiddlewareMutation')
    expect(result).not.toContain('GraphqlMiddlewareSubscription')
  })
})
