import { defineStaticTemplate } from './../defineTemplate'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DOCS = [
  // Composables
  {
    path: 'composables/useGraphqlQuery',
    file: 'composables/useGraphqlQuery.md',
    name: 'useGraphqlQuery',
    description: 'Execute a GraphQL query using $fetch',
  },
  {
    path: 'composables/useGraphqlMutation',
    file: 'composables/useGraphqlMutation.md',
    name: 'useGraphqlMutation',
    description: 'Execute a GraphQL mutation using $fetch',
  },
  {
    path: 'composables/useAsyncGraphqlQuery',
    file: 'composables/useAsyncGraphqlQuery.md',
    name: 'useAsyncGraphqlQuery',
    description: 'SSR-compatible GraphQL query with useAsyncData',
  },
  {
    path: 'composables/useGraphqlState',
    file: 'composables/useGraphqlState.md',
    name: 'useGraphqlState',
    description: 'Access cached GraphQL query state',
  },
  {
    path: 'composables/useGraphqlUploadMutation',
    file: 'composables/useGraphqlUploadMutation.md',
    name: 'useGraphqlUploadMutation',
    description: 'GraphQL mutation with file upload support',
  },
  // Configuration
  {
    path: 'configuration/module',
    file: 'configuration/module.md',
    name: 'Module Configuration',
    description: 'Configure the nuxt-graphql-middleware module options',
  },
  {
    path: 'configuration/client-options',
    file: 'configuration/client-options.md',
    name: 'Client Options',
    description: 'Configure client-side GraphQL request behavior',
  },
  {
    path: 'configuration/server-options',
    file: 'configuration/server-options.md',
    name: 'Server Options',
    description: 'Configure server-side GraphQL request handling',
  },
  {
    path: 'configuration/module-hooks',
    file: 'configuration/module-hooks.md',
    name: 'Module Hooks',
    description: 'Use Nuxt hooks to customize module behavior',
  },
  {
    path: 'configuration/module-utils',
    file: 'configuration/module-utils.md',
    name: 'Module Utils',
    description: 'Utility functions for working with the module',
  },
  {
    path: 'configuration/runtime-config',
    file: 'configuration/runtime-config.md',
    name: 'Runtime Config',
    description: 'Configure runtime settings via Nuxt runtime config',
  },
]

/**
 * Template that generates a module exporting documentation as an array of objects.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/docs' },
  (helper) => {
    const docsDir = helper.resolvers.module.resolve('../docs')

    const entries: string[] = []

    // Only generate docs in dev mode.
    if (helper.isDev) {
      for (const doc of DOCS) {
        const filePath = join(docsDir, doc.file)
        let content = ''
        try {
          const raw = readFileSync(filePath, 'utf-8')
          // Escape backticks and backslashes for template literal
          content = raw
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${')
        } catch {
          // Empty content if file not found
        }

        entries.push(`  {
    uri: 'docs://${doc.path}',
    name: '${doc.name}',
    description: '${doc.description}',
    content: \`${content}\`
  }`)
      }
    }

    return `export const docs = [\n${entries.join(',\n')}\n]`
  },
  () => {
    return `export const docs: Array<{
  uri: string
  name: string
  description: string
  content: string
}>`
  },
)
