import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  moduleConfigOutputSchema,
  type GetModuleConfigResponse,
} from './types'

export const moduleGetConfigTool = defineMcpTool({
  name: 'module-get-config',
  title: 'Module Configuration',
  description:
    'Get internal configuration and state of the nuxt-graphql-middleware module. Returns resolved paths and patterns used by the module.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {},
  outputSchema: moduleConfigOutputSchema,
  handler: async () => {
    const response =
      await fetchFromMcpHandler<GetModuleConfigResponse>('module-get-config')

    return structuredResult({
      autoImportPatterns: response.autoImportPatterns,
      paths: response.paths,
    })
  },
})
