import { describe, expect, test } from 'vitest'
import { GraphqlMiddlewareCache } from './../../../src/runtime/helpers/ClientCache'

describe('GraphqlMiddlewareCache', () => {
  test('removes the least recently used entry', () => {
    const cache = new GraphqlMiddlewareCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.set('c', 3)

    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  test('keeps the links of an async data key when its own entry is evicted', () => {
    const cache = new GraphqlMiddlewareCache(2)
    // The response from the payload, stored under the async data key.
    cache.set('asyncDataKey', 'payload')
    cache.set('query:a', 'response', 'asyncDataKey')
    // Evicts the entry of the payload.
    cache.set('query:b', 'other')

    cache.purgeAsyncDataKey('asyncDataKey')
    expect(cache.get('query:a')).toBeUndefined()
    expect(cache.get('query:b')).toBe('other')
  })

  test('removes the links of a removed entry', () => {
    const cache = new GraphqlMiddlewareCache()
    cache.set('query:a', 'response', 'asyncDataKey')
    cache.remove('query:a')

    expect(cache.asyncDataKeyMap).toEqual({})
  })

  test('removes the links of an evicted entry', () => {
    const cache = new GraphqlMiddlewareCache(1)
    cache.set('query:a', 'response', 'asyncDataKey')
    cache.set('query:b', 'other')

    expect(cache.asyncDataKeyMap).toEqual({})
  })

  test('links an entry to an async data key once', () => {
    const cache = new GraphqlMiddlewareCache()
    cache.set('query:a', 1, 'asyncDataKey')
    cache.set('query:a', 2, 'asyncDataKey')

    expect(cache.asyncDataKeyMap).toEqual({ asyncDataKey: ['query:a'] })
  })

  test('removes the entries and the links of an async data key', () => {
    const cache = new GraphqlMiddlewareCache()
    cache.set('asyncDataKey', 'payload', 'asyncDataKey')
    cache.set('query:a', 'response', 'asyncDataKey')
    cache.set('query:b', 'other')
    cache.purgeAsyncDataKey('asyncDataKey')

    expect(cache.get('asyncDataKey')).toBeUndefined()
    expect(cache.get('query:a')).toBeUndefined()
    expect(cache.get('query:b')).toBe('other')
    expect(cache.asyncDataKeyMap).toEqual({})
  })

  test('removes an entry linked to two async data keys from both', () => {
    const cache = new GraphqlMiddlewareCache()
    cache.set('query:a', 'response', 'first')
    cache.set('query:a', 'response', 'second')
    cache.set('query:b', 'other', 'second')
    cache.purgeAsyncDataKey('first')

    expect(cache.get('query:a')).toBeUndefined()
    expect(cache.get('query:b')).toBe('other')
    expect(cache.asyncDataKeyMap).toEqual({ second: ['query:b'] })
  })
})
