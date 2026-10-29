import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { H3Event } from 'h3'
import eventHandler from './../../../src/runtime/server/api/upload'

vi.mock('#nuxt-graphql-middleware/documents', () => {
  return {
    documents: {
      mutation: {
        barfoo: 'Mutation',
        withoutFiles: 'Mutation without file variables',
      },
    },
  }
})

vi.mock('#nuxt-graphql-middleware/upload-mutations', () => {
  return {
    uploadMutations: ['barfoo'],
  }
})

const bodySizeLimit = vi.hoisted(() => {
  return { upload: false as number | false }
})

vi.mock('#imports', () => {
  return {
    useRuntimeConfig: () => {
      return {
        graphqlMiddleware: {
          graphqlEndpoint: 'http//localhost/graphql',
          bodySizeLimit,
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

function buildBody(variables = '{"file":null}') {
  return [
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="variables"',
    '',
    variables,
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
}

function testHandler(
  headers: Record<string, string>,
  body = buildBody(),
  contentType = `multipart/form-data; boundary=${BOUNDARY}`,
  name = 'barfoo',
) {
  const req: Partial<IncomingMessage> & { body?: Buffer } = {}
  const res: Partial<ServerResponse> = {
    setHeader: vi.fn(),
  }
  req.method = 'POST'
  req.url = 'http://localhost:3000/api/graphql_middleware/upload/' + name
  req.headers = {
    'content-type': contentType,
    ...headers,
  }
  req.body = Buffer.from(body)
  const event = new H3Event(req as any, res as any)
  event.context.params = {
    name,
  }
  return eventHandler(event)
}

const UPLOAD_HEADER = { 'x-nuxt-graphql-middleware-upload': '1' }

describe('upload handler', () => {
  afterEach(() => {
    bodySizeLimit.upload = false
  })

  test('Should forward the upload', async () => {
    fetchMock.raw.mockClear()
    const result = await testHandler(UPLOAD_HEADER)
    expect(result.endpoint).toBe('http//localhost/graphql')
    const formData = result.options.body as FormData
    expect(JSON.parse(formData.get('operations') as string)).toEqual({
      query: 'Mutation',
      variables: { file: null },
      operationName: 'barfoo',
    })
    expect(formData.get('map')).toBe('{"0":["variables.file"]}')
    const file = formData.get('0') as File
    expect(file.name).toBe('test.txt')
    expect(file.type).toBe('text/plain')
    expect(await file.text()).toBe('Hello')
  })

  test('Should refuse a request without the upload header', async () => {
    fetchMock.raw.mockClear()
    await expect(testHandler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })

  test('Should refuse a mutation without file variables', async () => {
    fetchMock.raw.mockClear()
    await expect(
      testHandler(UPLOAD_HEADER, buildBody(), undefined, 'withoutFiles'),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })

  test('Should refuse a request that is not multipart', async () => {
    await expect(
      testHandler(UPLOAD_HEADER, '{}', 'application/json'),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test.each([['{"file":'], ['[]'], ['null'], ['"foobar"']])(
    'Should refuse invalid variables: %s',
    async (variables) => {
      await expect(
        testHandler(UPLOAD_HEADER, buildBody(variables)),
      ).rejects.toMatchObject({ statusCode: 400 })
    },
  )

  test('Should refuse a request without variables', async () => {
    const body = [
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="map"',
      '',
      '{}',
      `--${BOUNDARY}--`,
      '',
    ].join('\r\n')
    await expect(testHandler(UPLOAD_HEADER, body)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  test('Should refuse a request whose content length is too large', async () => {
    bodySizeLimit.upload = 100
    await expect(
      testHandler({ ...UPLOAD_HEADER, 'content-length': '101' }),
    ).rejects.toMatchObject({ statusCode: 413 })
  })

  test('Should refuse a body that is too large', async () => {
    bodySizeLimit.upload = buildBody().length - 1
    await expect(testHandler(UPLOAD_HEADER)).rejects.toMatchObject({
      statusCode: 413,
    })
  })

  test('Should accept a body up to the limit', async () => {
    bodySizeLimit.upload = buildBody().length
    const result = await testHandler(UPLOAD_HEADER)
    expect(result.options.body).toBeInstanceOf(FormData)
  })
})
