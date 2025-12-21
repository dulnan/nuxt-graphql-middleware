import type { Collector } from '../../Collector'
import type { GetFragmentSourceResponse } from '../../../runtime/server/mcp/tools/fragments-get-source/types'

export function handleGetFragmentSource(
  collector: Collector,
  name: string,
  includeDependencies: boolean = false,
): GetFragmentSourceResponse {
  const fragment = collector.getFragment(name)

  if (!fragment) {
    return { source: null, error: `Fragment "${name}" not found` }
  }

  // Return source or sourceFull based on includeDependencies flag.
  const source = includeDependencies ? fragment.sourceFull : fragment.source
  return { source }
}
