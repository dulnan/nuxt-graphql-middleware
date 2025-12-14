import { relative, isAbsolute } from 'node:path'
import type { ModuleHelper } from '../../ModuleHelper'
import type { GetModuleConfigResponse } from '../../../runtime/server/mcp/tools/module-get-config/types'

function makeRelative(rootDir: string, path: string | null): string | null {
  if (!path) {
    return null
  }
  // If path is absolute, compute relative path from rootDir
  if (isAbsolute(path)) {
    const rel = relative(rootDir, path)
    // Ensure it starts with ./ or ../
    if (!rel.startsWith('.')) {
      return './' + rel
    }
    return rel
  }
  // Already relative
  if (!path.startsWith('.')) {
    return './' + path
  }
  return path
}

export function handleGetModuleConfig(
  helper: ModuleHelper,
): GetModuleConfigResponse {
  const rootDir = helper.nuxt.options.rootDir

  return {
    autoImportPatterns: (helper.options.autoImportPatterns || []).map(
      (pattern) => makeRelative(rootDir, pattern)!,
    ),
    paths: {
      runtimeTypes: makeRelative(rootDir, helper.paths.runtimeTypes)!,
      schema: makeRelative(rootDir, helper.paths.schema)!,
      serverOptions: makeRelative(rootDir, helper.paths.serverOptions),
      clientOptions: makeRelative(rootDir, helper.paths.clientOptions),
      documentTypes: makeRelative(
        rootDir,
        helper.paths.moduleTypesDir + '/index.d.ts',
      )!,
    },
  }
}
