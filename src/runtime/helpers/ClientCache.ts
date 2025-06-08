/**
 * Simple LRU (least recently used) cache.
 *
 * Keeps the amount of cached items limited to the given max size.
 * Once that number is reached, the cache item used the least is removed.
 */
export class GraphqlMiddlewareCache {
  cache: Record<string, unknown> = {}
  asyncDataKeyMap: Record<string, string[]> = {}
  keys: string[] = []
  maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  set(key: string, value: unknown, asyncDataKey?: string): void {
    if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
      // Key already exists, remove it from the current position
      // because it will be pushed to the end of the array below.
      const index = this.keys.indexOf(key)
      if (index > -1) {
        this.keys.splice(index, 1)
      }
    } else if (this.keys.length >= this.maxSize) {
      // If we've reached the limit of our cache, remove the oldest entry.
      const oldestKey = this.keys.shift()
      if (oldestKey !== undefined) {
        // eslint-disable-next-line
        delete this.cache[oldestKey]
        // eslint-disable-next-line
        delete this.asyncDataKeyMap[oldestKey]
      }
    }

    // Add the cache entry.
    this.cache[key] = value

    // Add the key to the end to mark it as the most recently used.
    this.keys.push(key)

    if (asyncDataKey) {
      if (
        !Object.prototype.hasOwnProperty.call(
          this.asyncDataKeyMap,
          asyncDataKey,
        )
      ) {
        this.asyncDataKeyMap[asyncDataKey] = []
      }

      this.asyncDataKeyMap[asyncDataKey]!.push(key)
    }
  }

  get<T>(key: string): T | undefined {
    const value = this.cache[key]
    if (value !== undefined) {
      // Move the key to the end to mark it as the most recently used.
      const index = this.keys.indexOf(key)
      if (index > -1) {
        // Remove the key from its current position.
        this.keys.splice(index, 1)

        // Push it to the end.
        this.keys.push(key)
      }
      return value as T
    }

    return undefined
  }

  purge() {
    this.cache = {}
    this.keys = []
    this.asyncDataKeyMap = {}
  }

  purgeAsyncDataKey(asyncDataKey: string) {
    const keys = this.asyncDataKeyMap[asyncDataKey]
    if (keys && keys.length) {
      keys.forEach((key) => {
        this.remove(key)
      })
    }
  }

  remove(key: string) {
    if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.cache[key]

      const index = this.keys.indexOf(key)
      if (index > -1) {
        this.keys.splice(index, 1)
      }

      return true
    }

    return false
  }
}
