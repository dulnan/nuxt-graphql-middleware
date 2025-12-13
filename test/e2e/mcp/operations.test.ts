import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

describe('MCP Operations Tools', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  describe('operations-list', () => {
    it('should list all operations with correct count and names', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-list',
        arguments: {},
      })

      const structured = result.structuredContent as {
        count: number
        operations: Array<{ name: string; type: string }>
      }

      // Get sorted operation names for consistent snapshot
      const operationNames = structured.operations
        .map((op) => `${op.type}:${op.name}`)
        .sort()

      expect(structured.count).toMatchInlineSnapshot(`34`)
      expect(operationNames).toMatchInlineSnapshot(`
        [
          "mutation:addUser",
          "mutation:deleteUser",
          "mutation:initState",
          "mutation:testFormSubmit",
          "mutation:testUpload",
          "mutation:triggerError",
          "query:allContent",
          "query:articles",
          "query:blogPosts",
          "query:contentBySlug",
          "query:contentByUser",
          "query:fetchOptions",
          "query:fetchOptionsComposable",
          "query:foobar",
          "query:getCurrentTime",
          "query:getError",
          "query:getSubmissions",
          "query:highDepthOne",
          "query:hmr",
          "query:moduleQueryFromDisk",
          "query:pages",
          "query:queryFromHook",
          "query:queryFromModule",
          "query:queryOne",
          "query:queryTwo",
          "query:returnSameValue",
          "query:search",
          "query:simulateEndpointDown",
          "query:testClientOptions",
          "query:testEscape",
          "query:userById",
          "query:users",
          "query:usersFromConfig",
          "query:usersPaginated",
        ]
      `)
    })

    it('should return correct structure for users query', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-list',
        arguments: {},
      })

      const structured = result.structuredContent as {
        operations: Array<{
          name: string
          type: 'query' | 'mutation'
          filePath: string
          hasVariables: boolean
          needsVariables: boolean
          variablesTypeName: string
          responseTypeName: string
        }>
      }

      const usersOp = structured.operations.find((op) => op.name === 'users')
      expect(usersOp).toMatchInlineSnapshot(`
        {
          "filePath": "./app/pages/userList.graphql",
          "hasVariables": false,
          "name": "users",
          "needsVariables": false,
          "responseTypeName": "UsersQuery",
          "type": "query",
          "variablesTypeName": "UsersQueryVariables",
        }
      `)
    })

    it('should return correct structure for operation with variables', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-list',
        arguments: {},
      })

      const structured = result.structuredContent as {
        operations: Array<{
          name: string
          type: 'query' | 'mutation'
          filePath: string
          hasVariables: boolean
          needsVariables: boolean
          variablesTypeName: string
          responseTypeName: string
        }>
      }

      const paginatedOp = structured.operations.find(
        (op) => op.name === 'usersPaginated',
      )
      expect(paginatedOp).toMatchInlineSnapshot(`
        {
          "filePath": "./app/pages/use-async-graphql-query-pagination/query.usersPaginated.graphql",
          "hasVariables": true,
          "name": "usersPaginated",
          "needsVariables": true,
          "responseTypeName": "UsersPaginatedQuery",
          "type": "query",
          "variablesTypeName": "UsersPaginatedQueryVariables",
        }
      `)
    })
  })

  describe('operations-get', () => {
    it('should get full details for users query (without source)', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-get',
        arguments: { operationName: 'users' },
      })

      const structured = result.structuredContent as {
        name: string
        type: string
        filePath: string
        hasVariables: boolean
        needsVariables: boolean
        variablesTypeName: string
        responseTypeName: string
      }

      // operations-get returns metadata only, no source
      expect(structured).toMatchInlineSnapshot(`
        {
          "filePath": "./app/pages/userList.graphql",
          "hasVariables": false,
          "name": "users",
          "needsVariables": false,
          "responseTypeName": "UsersQuery",
          "type": "query",
          "variablesTypeName": "UsersQueryVariables",
        }
      `)
    })

    it('should get details for mutation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-get',
        arguments: { operationName: 'addUser' },
      })

      const structured = result.structuredContent as {
        name: string
        type: string
        hasVariables: boolean
        needsVariables: boolean
      }

      expect(structured.name).toBe('addUser')
      expect(structured.type).toBe('mutation')
      expect(structured.hasVariables).toBe(true)
      expect(structured.needsVariables).toBe(true)
    })

    it('should return error for non-existent operation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-get',
        arguments: { operationName: 'nonExistentOperation' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Operation "nonExistentOperation" not found"`,
      )
    })
  })

  describe('operations-get-source', () => {
    it('should get just the operation source by default', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-get-source',
        arguments: { operationName: 'users' },
      })

      const structured = result.structuredContent as {
        source: string
      }

      // By default, should only contain the operation, not fragment definitions
      expect(structured.source).toContain('...user')
      expect(structured.source).not.toContain('fragment user on User')
      expect(structured.source).toMatchInlineSnapshot(`
        "query users {
          users {
            ...user
          }

          # asdfasdfa
        }"
      `)
    })

    it('should include fragment definitions when includeDependencies is true', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-get-source',
        arguments: { operationName: 'users', includeDependencies: true },
      })

      const structured = result.structuredContent as {
        source: string
      }

      // With includeDependencies, should contain both operation and fragment
      expect(structured.source).toContain('...user')
      expect(structured.source).toContain('fragment user on User')
    })
  })

  describe('operations-execute', () => {
    it('should execute a query without variables', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-execute',
        arguments: {
          type: 'query',
          name: 'users',
        },
      })

      const structured = result.structuredContent as {
        data: { users: Array<{ id: string }> } | null
        errors?: Array<{ message: string }>
      }

      expect(structured.data).toBeDefined()
      expect(structured.data?.users).toBeInstanceOf(Array)
      expect(structured.data?.users.length).toBeGreaterThan(0)
      expect(structured.errors).toBeUndefined()
    })

    it('should execute a query with variables', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-execute',
        arguments: {
          type: 'query',
          name: 'userById',
          variables: { id: '1' },
        },
      })

      const structured = result.structuredContent as {
        data: { userById: { id: string } | null } | null
        errors?: Array<{ message: string }>
      }

      expect(structured.data).toBeDefined()
      expect(structured.data?.userById).toBeDefined()
      // ID is returned as number from GraphQL
      expect(String(structured.data?.userById?.id)).toBe('1')
      expect(structured.errors).toBeUndefined()
    })

    it('should execute a mutation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-execute',
        arguments: {
          type: 'mutation',
          name: 'initState',
        },
      })

      const structured = result.structuredContent as {
        data: { initState: boolean } | null
        errors?: Array<{ message: string }>
      }

      expect(structured.data).toBeDefined()
      expect(structured.data?.initState).toBe(true)
      expect(structured.errors).toBeUndefined()
    })

    it('should return error for non-existent operation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-execute',
        arguments: {
          type: 'query',
          name: 'nonExistentQuery',
        },
      })

      const structured = result.structuredContent as {
        data: null
        errors?: Array<{ message: string }>
      }

      // Non-existent operation returns null data
      // The middleware returns a 404 which is handled gracefully
      expect(structured.data).toBeNull()
    })

    it('should handle GraphQL errors in response', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'operations-execute',
        arguments: {
          type: 'query',
          name: 'getError',
        },
      })

      const structured = result.structuredContent as {
        data: null
        errors?: Array<{ message: string }>
      }

      expect(structured.errors).toBeDefined()
      expect(structured.errors!.length).toBeGreaterThan(0)
      expect(structured.errors![0].message).toContain('Something is wrong')
    })
  })
})
