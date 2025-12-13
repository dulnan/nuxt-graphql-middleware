import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

describe('MCP Tools Discovery', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  it('should connect to MCP server', async () => {
    const client = await ensureMcpClient()
    expect(client).toBeDefined()
  })

  it('should list all available tools', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()

    expect(tools).toBeDefined()
    expect(tools.tools).toBeInstanceOf(Array)
    expect(tools.tools.length).toBeGreaterThan(0)
  })

  it('should include all expected operation tools', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()
    const toolNames = tools.tools.map((t) => t.name)

    expect(toolNames).toContain('operations-list')
    expect(toolNames).toContain('operations-get')
    expect(toolNames).toContain('operations-get-source')
    expect(toolNames).toContain('operations-get-field-usage')
  })

  it('should include all expected fragment tools', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()
    const toolNames = tools.tools.map((t) => t.name)

    expect(toolNames).toContain('fragments-list')
    expect(toolNames).toContain('fragments-get')
    expect(toolNames).toContain('fragments-get-source')
    expect(toolNames).toContain('fragments-list-for-type')
  })

  it('should include all expected schema tools', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()
    const toolNames = tools.tools.map((t) => t.name)

    expect(toolNames).toContain('schema-get-type')
    expect(toolNames).toContain('schema-get-type-definition')
    expect(toolNames).toContain('schema-list-types')
    expect(toolNames).toContain('schema-get-interface-implementors')
    expect(toolNames).toContain('schema-get-union-members')
    expect(toolNames).toContain('schema-get-type-usage')
    expect(toolNames).toContain('schema-validate-document')
  })

  it('should include graphql-execute tool', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()
    const toolNames = tools.tools.map((t) => t.name)

    expect(toolNames).toContain('graphql-execute')
  })

  it('should have descriptions for all tools', async () => {
    const client = await ensureMcpClient()
    if (!client) {
      return
    }

    const tools = await client.listTools()

    for (const tool of tools.tools) {
      expect(
        tool.description,
        `Tool ${tool.name} should have a description`,
      ).toBeDefined()
      expect(tool.description!.length).toBeGreaterThan(0)
    }
  })
})
