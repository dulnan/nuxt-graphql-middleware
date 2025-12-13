import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

describe('MCP Schema Tools', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  describe('schema-list-types', () => {
    it('should list all schema types', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-list-types',
        arguments: {},
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        count: number
        types: Array<{
          name: string
          kind: string
          description?: string
        }>
      }

      expect(structured.count).toBeGreaterThan(0)
      expect(structured.types).toBeInstanceOf(Array)

      // Should include standard GraphQL types
      const typeNames = structured.types.map((t) => t.name)
      expect(typeNames).toContain('Query')
    })

    it('should filter types by kind', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-list-types',
        arguments: { kind: 'OBJECT' },
      })

      const structured = result.structuredContent as {
        types: Array<{
          name: string
          kind: string
        }>
      }

      // All returned types should be OBJECT kind
      for (const type of structured.types) {
        expect(type.kind).toBe('OBJECT')
      }
    })

    it('should filter enum types', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-list-types',
        arguments: { kind: 'ENUM' },
      })

      const structured = result.structuredContent as {
        types: Array<{
          name: string
          kind: string
        }>
      }

      for (const type of structured.types) {
        expect(type.kind).toBe('ENUM')
      }
    })
  })

  describe('schema-get-type', () => {
    it('should get details for Query type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type',
        arguments: { typeName: 'Query' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        name: string
        kind: string
        fields?: Array<{
          name: string
          type: string
        }>
      }

      expect(structured.name).toBe('Query')
      expect(structured.kind).toBe('OBJECT')
      expect(structured.fields).toBeInstanceOf(Array)
      expect(structured.fields!.length).toBeGreaterThan(0)
    })

    it('should get details for User type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type',
        arguments: { typeName: 'User' },
      })

      const structured = result.structuredContent as {
        name: string
        kind: string
        fields?: Array<{
          name: string
          type: string
        }>
      }

      expect(structured.name).toBe('User')
      expect(structured.kind).toBe('OBJECT')
      expect(structured.fields).toBeInstanceOf(Array)

      // User should have common fields
      const fieldNames = structured.fields!.map((f) => f.name)
      expect(fieldNames).toContain('id')
    })

    it('should return error for non-existent type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type',
        arguments: { typeName: 'NonExistentType' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "NonExistentType" not found in schema"`,
      )
    })
  })

  describe('schema-get-type-definition', () => {
    it('should get SDL definition for a type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type-definition',
        arguments: { typeName: 'User' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        definition: string
      }

      expect(structured.definition).toContain('type User')
      expect(structured.definition).toContain('id')
    })

    it('should return error for non-existent type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type-definition',
        arguments: { typeName: 'NonExistentType' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "NonExistentType" not found in schema"`,
      )
    })
  })

  describe('schema-validate-document', () => {
    it('should validate a correct GraphQL document', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              users {
                id
              }
            }
          `,
        },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(true)
      expect(structured.errors || []).toHaveLength(0)
    })

    it('should return errors for unknown field', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              nonExistentField {
                id
              }
            }
          `,
        },
      })

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(false)
      expect(structured.errors).toMatchInlineSnapshot(`
        [
          {
            "locations": [
              {
                "column": 15,
                "line": 3,
              },
            ],
            "message": "Cannot query field "nonExistentField" on type "Query".",
          },
        ]
      `)
    })

    it('should return errors for syntax errors', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              users {
                id
              // missing closing brace
          `,
        },
      })

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(false)
      expect(structured.errors).toBeDefined()
      expect(structured.errors!.length).toBeGreaterThan(0)
      // Syntax error message contains line/column info
      expect(structured.errors![0].message).toContain('Syntax Error')
    })

    it('should return errors for type mismatch in arguments', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              search(text: 123) {
                __typename
              }
            }
          `,
        },
      })

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(false)
      expect(structured.errors).toMatchInlineSnapshot(`
        [
          {
            "locations": [
              {
                "column": 22,
                "line": 3,
              },
            ],
            "message": "Unknown argument "text" on field "Query.search".",
          },
          {
            "locations": [
              {
                "column": 15,
                "line": 3,
              },
            ],
            "message": "Field "search" argument "query" of type "String!" is required, but it was not provided.",
          },
        ]
      `)
    })

    it('should return errors for missing required arguments', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              search {
                __typename
              }
            }
          `,
        },
      })

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(false)
      expect(structured.errors).toMatchInlineSnapshot(`
        [
          {
            "locations": [
              {
                "column": 15,
                "line": 3,
              },
            ],
            "message": "Field "search" argument "query" of type "String!" is required, but it was not provided.",
          },
        ]
      `)
    })

    it('should return errors for unknown fragment', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-validate-document',
        arguments: {
          document: `
            query TestQuery {
              users {
                ...unknownFragment
              }
            }
          `,
        },
      })

      const structured = result.structuredContent as {
        valid: boolean
        errors?: Array<{ message: string }>
      }

      expect(structured.valid).toBe(false)
      expect(structured.errors).toMatchInlineSnapshot(`
        [
          {
            "locations": [
              {
                "column": 20,
                "line": 4,
              },
            ],
            "message": "Unknown fragment "unknownFragment".",
          },
        ]
      `)
    })
  })

  describe('schema-get-type-usage', () => {
    it('should find where a type is used', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type-usage',
        arguments: { typeName: 'User' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        usages: Array<{
          typeName: string
          fieldName: string
        }>
      }

      expect(structured.usages).toBeInstanceOf(Array)
      // User should be used in Query.users, Query.userById, etc.
      expect(structured.usages.length).toBeGreaterThan(0)
    })

    it('should return error for non-existent type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-type-usage',
        arguments: { typeName: 'NonExistentType' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "NonExistentType" not found in schema"`,
      )
    })
  })

  describe('schema-get-interface-implementors', () => {
    it('should find types implementing an interface', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-interface-implementors',
        arguments: { interfaceName: 'Content' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        types: Array<{
          name: string
          description?: string | null
        }>
      }

      expect(structured.types).toBeInstanceOf(Array)
      // Content interface is implemented by Article, Page, BlogPost
      const names = structured.types.map((t) => t.name).sort()
      expect(names).toMatchInlineSnapshot(`
        [
          "Article",
          "BlogPost",
          "Page",
        ]
      `)
    })

    it('should return error for non-existent interface', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-interface-implementors',
        arguments: { interfaceName: 'NonExistentInterface' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "NonExistentInterface" not found in schema"`,
      )
    })

    it('should return error when type is not an interface', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-interface-implementors',
        arguments: { interfaceName: 'User' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "User" is not an interface"`,
      )
    })
  })

  describe('schema-get-union-members', () => {
    it('should find members of a union type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-union-members',
        arguments: { unionName: 'SearchResult' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        members: Array<{
          name: string
          description?: string
        }>
      }

      expect(structured.members).toBeInstanceOf(Array)
      // SearchResult union includes Article, Page, BlogPost, User
      const names = structured.members.map((m) => m.name).sort()
      expect(names).toMatchInlineSnapshot(`
        [
          "Article",
          "BlogPost",
          "Page",
          "User",
        ]
      `)
    })

    it('should return error for non-existent union', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-union-members',
        arguments: { unionName: 'NonExistentUnion' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "NonExistentUnion" not found in schema"`,
      )
    })

    it('should return error when type is not a union', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'schema-get-union-members',
        arguments: { unionName: 'User' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toMatchInlineSnapshot(
        `"Type "User" is not a union"`,
      )
    })
  })
})
