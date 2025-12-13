import type { Collector } from '../../Collector'
import type { ListFragmentsResponse } from '../../../runtime/server/mcp/tools/fragments-list/types'

export function handleListFragments(
  collector: Collector,
): ListFragmentsResponse {
  return { fragments: collector.getFragments() }
}
