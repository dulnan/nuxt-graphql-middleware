import { z } from 'zod'
import { defineMcpTool, defineMcpHandler } from '#imports'

const migrationTool = defineMcpTool({
  name: 'migrate-v3-to-v4',
  title: 'Migrate v3 to v4',
  description: 'Migrate code from version 3 to version 4',
  inputSchema: {
    code: z.string().describe('The code to migrate'),
  },
  handler: async ({ code }) => {
    const migrated = code.replace(/v3/g, 'v4')
    return {
      content: [
        {
          type: 'text',
          text: migrated,
        },
      ],
    }
  },
})

export default defineMcpHandler({
  name: 'nuxt-graphql-middleware',
  version: '1.0.0',
  route: '/mcp/nuxt-graphql-middleware',
  tools: [migrationTool],
  browserRedirect: '/',
})
