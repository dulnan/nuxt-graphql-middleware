import type { Collector } from '../../Collector'
import type { ListOperationsResponse } from './types'

export function handleListOperations(
  collector: Collector,
): ListOperationsResponse {
  return { operations: collector.getOperations() }
}
