import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import {
  setupMcpClient,
  cleanupMcpTests,
  getMcpClient,
} from '../helpers/mcp-setup'

export async function setupMcpTests() {
  await setup({
    rootDir: fileURLToPath(new URL('./../../../playground', import.meta.url)),
    server: true,
    dev: true,
  })
}

export async function ensureMcpClient() {
  let client = getMcpClient()
  if (!client) {
    const mcpEndpoint = url('/mcp/nuxt-graphql-middleware')
    const mcpUrl = new URL(mcpEndpoint)
    client = await setupMcpClient(mcpUrl)
  }
  return client
}

export { cleanupMcpTests, getMcpClient }
