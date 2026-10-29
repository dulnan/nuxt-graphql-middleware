import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import eventHandler from './../../../src/runtime/server/api/upload'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      mutation: {
        barfoo: 'Mutation',
      },
    },
  }
})

vi.mock('#imports', () => {
  return {
    useRuntimeConfig: () => {
      return {
        graphqlMiddleware: {
          graphqlEndpoint: 'http//localhost/graphql',
        },
      }
    },
  }
})

vi.mock('#nuxt-graphql-middleware/server-options', () => {
  return {
    serverOptions: {},
  }
})

const fetchMock = {
  raw: vi.fn((endpoint: string, options: any) => {
    return Promise.resolve({
      _data: {
        data: {},
        options,
        endpoint,
      },
    })
  }),
}

vi.stubGlobal('$fetch', fetchMock)

const BOUNDARY = 'foobar'

function testHandler(headers: Record<string, string>) {
  const body = [
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="variables"',
    '',
    '{"file":null}',
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="map"',
    '',
    '{"0":["variables.file"]}',
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="0"; filename="test.txt"',
    'Content-Type: text/plain',
    '',
    'Hello',
    `--${BOUNDARY}--`,
    '',
  ].join('\r\n')

  const req: Partial<IncomingMessage> & { body?: Buffer } = {}
  const res: Partial<ServerResponse> = {}
  req.method = 'POST'
  req.url = 'http://localhost:3000/api/graphql_middleware/upload/barfoo'
  req.headers = {
    'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
    ...headers,
  }
  req.body = Buffer.from(body)
  const event = new H3Event(req as any, res as any)
  event.context.params = {
    name: 'barfoo',
  }
  return eventHandler(event)
}

describe('upload handler', () => {
  test('Should forward the upload', async () => {
    fetchMock.raw.mockClear()
    const result = await testHandler({
      'x-nuxt-graphql-middleware-upload': '1',
    })
    expect(result.endpoint).toBe('http//localhost/graphql')
    const formData = result.options.body as FormData
    expect(JSON.parse(formData.get('operations') as string)).toEqual({
      query: 'Mutation',
      variables: { file: null },
      operationName: 'barfoo',
    })
    expect(formData.get('map')).toBe('{"0":["variables.file"]}')
    expect(await (formData.get('0') as File).text()).toBe('Hello')
  })

  test('Should refuse a request without the upload header', async () => {
    fetchMock.raw.mockClear()
    await expect(testHandler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })
})
