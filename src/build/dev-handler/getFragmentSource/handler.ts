import type { Collector } from '../../Collector'
import type { GetFragmentSourceResponse } from './types'

export function handleGetFragmentSource(
  collector: Collector,
  name: string,
): GetFragmentSourceResponse {
  const fragment = collector.getFragment(name)

  if (!fragment) {
    return { source: null, error: `Fragment "${name}" not found` }
  }

  return { source: fragment.source }
}
