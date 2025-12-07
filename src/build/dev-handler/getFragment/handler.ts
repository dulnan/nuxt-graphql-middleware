import type { Collector } from '../../Collector'
import type { GetFragmentResponse } from './types'

export function handleGetFragment(
  collector: Collector,
  name: string,
): GetFragmentResponse {
  const fragment = collector.getFragment(name)

  if (!fragment) {
    return { fragment: null, error: `Fragment "${name}" not found` }
  }

  return { fragment }
}
