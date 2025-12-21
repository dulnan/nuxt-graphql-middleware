import type { Collector } from '../../Collector'
import type {
  ListOperationsResponse,
  OperationTypeFilter,
} from '../../../runtime/server/mcp/tools/operations-list/types'
import { createNameFilter } from '../filterUtils'

export function handleListOperations(
  collector: Collector,
  nameFilter?: string,
  typeFilter?: OperationTypeFilter,
): ListOperationsResponse {
  let operations = collector.getOperations()

  if (nameFilter) {
    const filterFn = createNameFilter(nameFilter)
    operations = operations.filter((op) => filterFn(op.name))
  }

  if (typeFilter) {
    operations = operations.filter((op) => op.type === typeFilter)
  }

  return { operations }
}
