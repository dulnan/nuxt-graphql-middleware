import { defineMcpHandler } from '#imports'

// Operation tools
import { listOperationsTool } from './tools/listOperations'
import { getOperationTool } from './tools/getOperation'
import { getOperationSourceTool } from './tools/getOperationSource'

// Fragment tools
import { listFragmentsTool } from './tools/listFragments'
import { getFragmentTool } from './tools/getFragment'
import { getFragmentSourceTool } from './tools/getFragmentSource'
import { getFragmentsForTypeTool } from './tools/getFragmentsForType'

// Schema tools
import { getSchemaTypeTool } from './tools/getSchemaType'
import { listSchemaTypesTool } from './tools/listSchemaTypes'
import { getTypesImplementingInterfaceTool } from './tools/getTypesImplementingInterface'
import { getUnionMembersTool } from './tools/getUnionMembers'
import { getTypeUsageTool } from './tools/getTypeUsage'
import { getFieldUsageTool } from './tools/getFieldUsage'
import { validateDocumentTool } from './tools/validateDocument'

export default defineMcpHandler({
  name: 'nuxt-graphql-middleware',
  version: '1.0.0',
  route: '/mcp/nuxt-graphql-middleware',
  tools: [
    // Operation tools
    listOperationsTool,
    getOperationTool,
    getOperationSourceTool,

    // Fragment tools
    listFragmentsTool,
    getFragmentTool,
    getFragmentSourceTool,
    getFragmentsForTypeTool,

    // Schema tools
    getSchemaTypeTool,
    listSchemaTypesTool,
    getTypesImplementingInterfaceTool,
    getUnionMembersTool,
    getTypeUsageTool,
    getFieldUsageTool,
    validateDocumentTool,
  ],
  browserRedirect: '/',
})
