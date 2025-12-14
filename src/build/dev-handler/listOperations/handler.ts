import type { Collector } from '../../Collector'
import type { ListOperationsResponse } from '../../../runtime/server/mcp/tools/operations-list/types'
import { createNameFilter } from '../filterUtils'

export function handleListOperations(
  collector: Collector,
  nameFilter?: string,
): ListOperationsResponse {
  let operations = collector.getOperations()

  if (nameFilter) {
    const filterFn = createNameFilter(nameFilter)
    operations = operations.filter((op) => filterFn(op.name))
  }

  return { operations }
}
