import type { Collector } from '../../Collector'
import type { GetOperationSourceResponse } from './types'

export function handleGetOperationSource(
  collector: Collector,
  name: string,
): GetOperationSourceResponse {
  const operations = collector.getOperations()
  const operation = operations.find((op) => op.name === name)

  if (!operation) {
    return { source: null, error: `Operation "${name}" not found` }
  }

  return { source: operation.source }
}
