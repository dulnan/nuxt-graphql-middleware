import type { Collector } from '../../Collector'
import type { ListOperationsResponse } from '../../../runtime/server/mcp/tools/operations-list/types'

export function handleListOperations(
  collector: Collector,
): ListOperationsResponse {
  return { operations: collector.getOperations() }
}
