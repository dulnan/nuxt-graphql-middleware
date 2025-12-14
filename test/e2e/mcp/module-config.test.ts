import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

interface ModulePaths {
  runtimeTypes: string
  schema: string
  serverOptions: string | null
  clientOptions: string | null
  documentTypes: string
}

interface ModuleConfigResponse {
  autoImportPatterns: string[]
  paths: ModulePaths
}

describe('MCP Module Config Tool', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  describe('module-get-config', () => {
    it('should return autoImportPatterns', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'module-get-config',
        arguments: {},
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as ModuleConfigResponse

      expect(structured.autoImportPatterns).toBeInstanceOf(Array)
      expect(structured.autoImportPatterns.length).toBeGreaterThan(0)

      // All patterns should be strings
      for (const pattern of structured.autoImportPatterns) {
        expect(typeof pattern).toBe('string')
      }

      // Should contain at least one .graphql or .gql pattern
      const hasGraphqlPattern = structured.autoImportPatterns.some(
        (p) => p.includes('.graphql') || p.includes('.gql'),
      )
      expect(hasGraphqlPattern).toBe(true)
    })

    it('should return relative paths for patterns', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'module-get-config',
        arguments: {},
      })

      const structured = result.structuredContent as ModuleConfigResponse

      // Non-negation patterns should be relative paths (start with ./)
      const nonNegationPatterns = structured.autoImportPatterns.filter(
        (p) => !p.startsWith('!'),
      )

      for (const pattern of nonNegationPatterns) {
        expect(pattern.startsWith('./')).toBe(true)
      }
    })

    it('should return module paths', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'module-get-config',
        arguments: {},
      })

      const structured = result.structuredContent as ModuleConfigResponse

      expect(structured.paths).toBeDefined()

      // runtimeTypes should be a string pointing to types.ts
      expect(typeof structured.paths.runtimeTypes).toBe('string')
      expect(structured.paths.runtimeTypes).toContain('types.ts')

      // schema should be a string pointing to a .graphql file
      expect(typeof structured.paths.schema).toBe('string')
      expect(structured.paths.schema).toContain('.graphql')

      // serverOptions can be null or a string
      expect(
        structured.paths.serverOptions === null ||
          typeof structured.paths.serverOptions === 'string',
      ).toBe(true)

      // clientOptions can be null or a string
      expect(
        structured.paths.clientOptions === null ||
          typeof structured.paths.clientOptions === 'string',
      ).toBe(true)

      // documentTypes should be a string pointing to index.d.ts
      expect(typeof structured.paths.documentTypes).toBe('string')
      expect(structured.paths.documentTypes).toContain('index.d.ts')
    })

    it('should return relative paths for module paths', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'module-get-config',
        arguments: {},
      })

      const structured = result.structuredContent as ModuleConfigResponse

      expect(structured.paths).toMatchInlineSnapshot(`
        {
          "clientOptions": "./app/graphqlMiddleware.clientOptions",
          "documentTypes": ".nuxt/graphql-operations/index.d.ts",
          "runtimeTypes": "../../../src/runtime/types.ts",
          "schema": "../schema.graphql",
          "serverOptions": "./server/graphqlMiddleware.serverOptions.ts",
        }
      `)
    })
  })
})
