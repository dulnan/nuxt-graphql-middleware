import type { WritableComputedRef } from 'vue'
import { type ComputedRef, useRoute, useRouter, computed } from '#imports'

/**
 * Returns a settable computed property for the given query parameter.
 *
 * When setting the value a router.push() is issued. By default the push will
 * set the `page` query parameter to `undefined`, as it is rarely desired to
 * e.g. update a search term in the query and remaining on the current page.
 * This behavior can be disabled by providing an empty array as the third argument
 * or extended by providing other keys.
 */
export function useQueryString(
  key: string | ComputedRef<string>,
  defaultValue = '',
  removeOtherKeys: string[] = ['page'],
): WritableComputedRef<string> {
  const route = useRoute()
  const router = useRouter()

  return computed({
    get() {
      const value = route.query[typeof key === 'string' ? key : key.value]
      if (!value) {
        return defaultValue
      }
      if (Array.isArray(value)) {
        return value[0] || defaultValue
      }
      return value
    },
    set(newValue) {
      router.push({
        query: {
          // Use the current query parameters.
          ...route.query,
          // Merge the keys to remove.
          ...Object.fromEntries(removeOtherKeys.map((key) => [key, undefined])),
          // Update the new query value.
          [typeof key === 'string' ? key : key.value]: newValue || undefined,
        },
      })
    },
  })
}
