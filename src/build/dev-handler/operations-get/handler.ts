import type { Collector } from '../../Collector'
import type { GetOperationResponse } from '../../../runtime/server/mcp/tools/operations-get/types'

export function handleGetOperation(
  collector: Collector,
  name: string,
): GetOperationResponse {
  const operations = collector.getOperations()
  const operation = operations.find((op) => op.name === name)

  if (!operation) {
    return { operation: null, error: `Operation "${name}" not found` }
  }

  return { operation }
}
