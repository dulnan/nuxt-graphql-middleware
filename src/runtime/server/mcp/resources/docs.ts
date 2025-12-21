import { defineMcpResource } from '#imports'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'
import { docs } from '#nuxt-graphql-middleware/mcp'

export default defineMcpResource({
  name: 'docs',
  title: 'Documentation',
  description:
    'Documentation for nuxt-graphql-middleware composables and utilities.',
  uri: new ResourceTemplate('docs://{+path}', {
    list: async () => {
      return {
        resources: docs.map((doc) => ({
          uri: doc.uri,
          name: doc.name,
          title: doc.name,
          mimeType: 'text/markdown',
          description: doc.description,
        })),
      }
    },
  }),
  metadata: { mimeType: 'text/markdown' },
  handler: async (uri: URL, variables: Variables) => {
    const path = variables.path as string
    const doc = docs.find((d) => d.uri === `docs://${path}`)
    const content = doc?.content || `Documentation not found for: ${path}`

    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    }
  },
})
