import type { Collector } from '../../Collector'
import type { ListFragmentsResponse } from '../../../runtime/server/mcp/tools/fragments-list/types'
import { createNameFilter } from '../filterUtils'

export function handleListFragments(
  collector: Collector,
  nameFilter?: string,
): ListFragmentsResponse {
  let fragments = collector.getFragments()

  if (nameFilter) {
    const filterFn = createNameFilter(nameFilter)
    fragments = fragments.filter((frag) => filterFn(frag.name))
  }

  return { fragments }
}
