import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import {
  setupMcpClient,
  cleanupMcpTests,
  getMcpClient,
} from '../helpers/mcp-setup'

// A separate build directory for each test file, like @nuxt/test-utils uses
// by default. The types are written there too: Nuxt otherwise writes them to
// playground/.nuxt, where they break the type check of later playground builds
// once the test build directory is removed.
export const buildDir = `.nuxt/test/${randomUUID().slice(0, 8)}`

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
