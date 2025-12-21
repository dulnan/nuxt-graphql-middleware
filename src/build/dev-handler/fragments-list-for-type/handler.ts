import type { Collector } from '../../Collector'
import type { GetFragmentsForTypeResponse } from '../../../runtime/server/mcp/tools/fragments-list-for-type/types'

export function handleGetFragmentsForType(
  collector: Collector,
  name: string,
): GetFragmentsForTypeResponse {
  return { fragments: collector.getFragmentsForType(name) }
}
