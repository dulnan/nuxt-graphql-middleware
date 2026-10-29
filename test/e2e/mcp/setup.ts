import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import {
  setupMcpClient,
  cleanupMcpTests,
  getMcpClient,
} from '../helpers/mcp-setup'

// By default @nuxt/test-utils builds into a random directory, while Nuxt
// still writes the types to playground/.nuxt. Once the test build directory
// is removed, these types break the type check of later playground builds.
const buildDir = '.nuxt/test-mcp'

export async function setupMcpTests() {
  await setup({
    rootDir: fileURLToPath(new URL('./../../../playground', import.meta.url)),
    buildDir,
    nuxtConfig: { typesDir: buildDir },
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
