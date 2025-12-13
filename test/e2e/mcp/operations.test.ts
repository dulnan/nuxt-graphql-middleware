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
    it('should get full details for users query', async () => {
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
        source: string
      }

      expect(structured.name).toBe('users')
      expect(structured.type).toBe('query')
      expect(structured.filePath).toBe('./app/pages/userList.graphql')
      expect(structured.hasVariables).toBe(false)
      expect(structured.needsVariables).toBe(false)
      expect(structured.variablesTypeName).toBe('UsersQueryVariables')
      expect(structured.responseTypeName).toBe('UsersQuery')
      expect(structured.source).toMatchInlineSnapshot(`
        "query users {
          users {
            ...user
          }

          # asdfasdfa
        }fragment user on User {
          id
          firstName
          lastName
          email
          description
          dateOfBirth
          description
          meansOfContact
          articleCount
        }"
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
    it('should get the exact GraphQL source', async () => {
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

      expect(structured.source).toMatchInlineSnapshot(`
        "query users {
          users {
            ...user
          }

          # asdfasdfa
        }fragment user on User {
          id
          firstName
          lastName
          email
          description
          dateOfBirth
          description
          meansOfContact
          articleCount
        }"
      `)
    })

    it('should include fragment definitions in source', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      // The users query uses a fragment
      const result = await client.callTool({
        name: 'operations-get-source',
        arguments: { operationName: 'users' },
      })

      const structured = result.structuredContent as {
        source: string
      }

      // Should contain fragment spread and fragment definition
      expect(structured.source).toContain('...user')
      expect(structured.source).toContain('fragment user on User')
    })
  })
})
