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
      expect(structured.error).toBeDefined()
      expect(structured.error).toContain('not found')
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

    it('should return errors for invalid GraphQL document', async () => {
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
      expect(structured.errors).toBeDefined()
      expect(structured.errors!.length).toBeGreaterThan(0)
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
    })
  })
})
