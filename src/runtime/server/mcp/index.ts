import { defineMcpHandler } from '#imports'
import type { McpToolDefinition } from '@nuxtjs/mcp-toolkit'
import {
  mcpServerRoute,
  includeComposables,
} from '#nuxt-graphql-middleware/mcp'

// Operation tools.
import { listOperationsTool } from './tools/operations-list'
import { getOperationTool } from './tools/operations-get'
import { getOperationSourceTool } from './tools/operations-get-source'
import { getFieldUsageTool } from './tools/operations-get-field-usage'
import { executeOperationTool } from './tools/operations-execute'

// Fragment tools.
import { listFragmentsTool } from './tools/fragments-list'
import { getFragmentTool } from './tools/fragments-get'
import { getFragmentSourceTool } from './tools/fragments-get-source'
import { getFragmentsForTypeTool } from './tools/fragments-list-for-type'

// Schema tools.
import { getSchemaTypeTool } from './tools/schema-get-type'
import { getSchemaTypeDefinitionTool } from './tools/schema-get-type-definition'
import { listSchemaTypesTool } from './tools/schema-list-types'
import { getTypesImplementingInterfaceTool } from './tools/schema-get-interface-implementors'
import { getUnionMembersTool } from './tools/schema-get-union-members'
import { getTypeUsageTool } from './tools/schema-get-type-usage'
import { validateDocumentTool } from './tools/schema-validate-document'

// Execution tools.
import { executeGraphqlTool } from './tools/graphql-execute'

// Example generation tools.
import { vueGraphqlComposableExampleTool } from './tools/vue-graphql-composable-example'
import { nitroGraphqlServerUtilsExampleTool } from './tools/nitro-graphql-server-utils-example'

// Module tools.
import { moduleGetConfigTool } from './tools/module-get-config'

// Resources.
import docsResource from './resources/docs'

const tools: McpToolDefinition<any, any>[] = [
  // Operation tools.
  listOperationsTool,
  getOperationTool,
  getOperationSourceTool,
  getFieldUsageTool,

  // Fragment tools.
  listFragmentsTool,
  getFragmentTool,
  getFragmentSourceTool,
  getFragmentsForTypeTool,

  // Schema tools.
  getSchemaTypeTool,
  getSchemaTypeDefinitionTool,
  listSchemaTypesTool,
  getTypesImplementingInterfaceTool,
  getUnionMembersTool,
  getTypeUsageTool,
  validateDocumentTool,

  // Execution tools.
  executeGraphqlTool,
  executeOperationTool,

  // Module tools.
  moduleGetConfigTool,
]

// Example generation tools, only include if actually added.
if (includeComposables) {
  tools.push(vueGraphqlComposableExampleTool)
  tools.push(nitroGraphqlServerUtilsExampleTool)
}

export default defineMcpHandler({
  name: 'nuxt-graphql-middleware',
  version: '1.0.0',
  route: mcpServerRoute,
  tools,
  resources: [docsResource],
  browserRedirect: '/',
})
