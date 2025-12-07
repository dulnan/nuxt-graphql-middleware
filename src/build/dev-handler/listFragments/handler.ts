import type { Collector } from '../../Collector'
import type { ListFragmentsResponse } from './types'

export function handleListFragments(
  collector: Collector,
): ListFragmentsResponse {
  return { fragments: collector.getFragments() }
}
