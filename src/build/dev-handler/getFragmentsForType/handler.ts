import type { Collector } from '../../Collector'
import type { GetFragmentsForTypeResponse } from './types'

export function handleGetFragmentsForType(
  collector: Collector,
  name: string,
): GetFragmentsForTypeResponse {
  return { fragments: collector.getFragmentsForType(name) }
}
