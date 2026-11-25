import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import {
  readJsonBody,
  readLimitedBody,
} from './../../../../src/runtime/server/helpers'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return { documents: { query: {}, mutation: {} } }
})

/**
 * The value that readRawBody(event, false) of the test returns.
 *
 * h3 v1 returns a Buffer. The h3 v1 compatibility layer of Nuxt on Nitro v3
 * (@nuxt/nitro-v3-server, runtime/compat/h3-v1-app) returns a plain
 * Uint8Array: `new Uint8Array(buffer)`.
 */
const raw = vi.hoisted(() => ({ value: undefined as unknown }))

vi.mock('h3', async (importOriginal) => {
  const original = await importOriginal<typeof import('h3')>()
  return {
    ...original,
    readRawBody: () => Promise.resolve(raw.value),
  }
})

function createEvent(body: unknown, contentType = 'application/json') {
  raw.value = body
  const req = {
    method: 'POST',
    url: 'http://localhost:3000/api/graphql_middleware/mutation/foo',
    headers: { 'content-type': contentType },
  }
  return new H3Event(req as any, { setHeader: vi.fn() } as any)
}

describe.each([
  ['Buffer (h3 v1)', (text: string) => Buffer.from(text)],
  ['Uint8Array (Nitro v3)', (text: string) => new TextEncoder().encode(text)],
])('readJsonBody with a %s body', (_label, encode) => {
  test('Should parse the JSON object', async () => {
    const event = createEvent(encode('{"name":"Ölfass ✓","count":2}'))
    await expect(readJsonBody(event, 1024)).resolves.toEqual({
      name: 'Ölfass ✓',
      count: 2,
    })
  })

  test('Should parse the JSON object without a limit', async () => {
    const event = createEvent(encode('{"id":"1"}'))
    await expect(readJsonBody(event, false)).resolves.toEqual({ id: '1' })
  })

  test('Should still refuse invalid JSON', async () => {
    const event = createEvent(encode('{"id":'))
    await expect(readJsonBody(event, 1024)).rejects.toThrow(
      'Invalid JSON body.',
    )
  })

  test('Should still refuse a body above the limit', async () => {
    const event = createEvent(encode('{"id":"12345"}'))
    await expect(readLimitedBody(event, 5)).rejects.toThrow(
      'The request body must not be larger than 5 bytes.',
    )
  })
})

describe('readJsonBody without a body', () => {
  test('Should return undefined', async () => {
    const event = createEvent(undefined)
    await expect(readJsonBody(event, 1024)).resolves.toBeUndefined()
  })
})
