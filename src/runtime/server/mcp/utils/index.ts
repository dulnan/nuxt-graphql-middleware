import { devServerUrl } from '#nuxt-graphql-middleware/mcp'

/**
 * Fetches data from the MCP dev handler using POST.
 */
export async function fetchFromMcpHandler<T>(
  tool: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return await $fetch<T>(`${devServerUrl}/__nuxt_graphql_middleware/mcp`, {
    method: 'POST',
    body: { tool, ...params },
  })
}

/**
 * Creates an MCP tool result with both content (for backwards compatibility)
 * and structuredContent (required when outputSchema is defined).
 */
export function structuredResult<T extends Record<string, unknown>>(data: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}
