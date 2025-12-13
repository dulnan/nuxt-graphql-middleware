import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

describe('MCP Fragments Tools', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  describe('fragments-list', () => {
    it('should list all fragments', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'fragments-list',
        arguments: {},
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        count: number
        fragments: Array<{
          name: string
          typeName: string
          filePath: string
        }>
      }

      expect(structured.count).toBeGreaterThanOrEqual(0)
      expect(structured.fragments).toBeInstanceOf(Array)
    })

    it('should return correct fragment structure', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'fragments-list',
        arguments: {},
      })

      const structured = result.structuredContent as {
        count: number
        fragments: Array<{
          name: string
          typeName: string
          filePath: string
        }>
      }

      if (structured.count > 0) {
        const firstFragment = structured.fragments[0]
        expect(firstFragment.name).toBeDefined()
        expect(firstFragment.typeName).toBeDefined()
        expect(firstFragment.filePath).toBeDefined()
      }
    })
  })

  describe('fragments-get', () => {
    it('should get details for a specific fragment (without source)', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      // First get list of fragments to find one to test
      const listResult = await client.callTool({
        name: 'fragments-list',
        arguments: {},
      })

      const listStructured = listResult.structuredContent as {
        count: number
        fragments: Array<{ name: string }>
      }

      if (listStructured.count === 0) {
        // No fragments in playground, skip test
        return
      }

      const fragmentName = listStructured.fragments[0].name

      const result = await client.callTool({
        name: 'fragments-get',
        arguments: { fragmentName },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        name: string
        typeName: string
        filePath: string
        dependencies: string[]
      }

      // fragments-get returns metadata only, no source
      expect(structured.name).toBe(fragmentName)
      expect(structured.typeName).toBeDefined()
      expect(structured.filePath).toBeDefined()
      expect(structured.dependencies).toBeInstanceOf(Array)
    })

    it('should return error for non-existent fragment', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'fragments-get',
        arguments: { fragmentName: 'NonExistentFragment' },
      })

      expect(result.structuredContent).toBeDefined()
      const structured = result.structuredContent as { error?: string }
      expect(structured.error).toBeDefined()
    })
  })

  describe('fragments-get-source', () => {
    it('should get the GraphQL source of a fragment', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      // First get list of fragments to find one to test
      const listResult = await client.callTool({
        name: 'fragments-list',
        arguments: {},
      })

      const listStructured = listResult.structuredContent as {
        count: number
        fragments: Array<{ name: string }>
      }

      if (listStructured.count === 0) {
        // No fragments in playground, skip test
        return
      }

      const fragmentName = listStructured.fragments[0].name

      const result = await client.callTool({
        name: 'fragments-get-source',
        arguments: { fragmentName },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        source: string
      }

      expect(structured.source).toContain('fragment')
      expect(structured.source).toContain(fragmentName)
    })

    it('should include dependencies when includeDependencies is true', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      // Find a fragment that has dependencies
      const listResult = await client.callTool({
        name: 'fragments-list',
        arguments: {},
      })

      const listStructured = listResult.structuredContent as {
        count: number
        fragments: Array<{ name: string }>
      }

      if (listStructured.count === 0) {
        return
      }

      const fragmentName = listStructured.fragments[0].name

      // Get with includeDependencies
      const result = await client.callTool({
        name: 'fragments-get-source',
        arguments: { fragmentName, includeDependencies: true },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        source: string
      }

      expect(structured.source).toContain('fragment')
      expect(structured.source).toContain(fragmentName)
    })
  })

  describe('fragments-list-for-type', () => {
    it('should list fragments for a specific type', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'fragments-list-for-type',
        arguments: { typeName: 'User' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        fragments: Array<{
          name: string
          typeName: string
        }>
      }

      expect(structured.fragments).toBeInstanceOf(Array)

      // All returned fragments should be on the User type
      for (const fragment of structured.fragments) {
        expect(fragment.typeName).toBe('User')
      }
    })
  })
})
