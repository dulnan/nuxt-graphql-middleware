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

vi.mock('nitropack/runtime', () => {
  return {
    useEvent: () => null,
  }
})

const serverOptions = vi.hoisted(() => {
  return {} as Record<string, any>
})

vi.mock('#nuxt-graphql-middleware/server-options', () => {
  return {
    serverOptions,
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

type Part = {
  name: string
  value: string
  filename?: string
}

function buildBody({
  variables = '{"file":null}',
  map = '{"0":["variables.file"]}',
  files = [{ name: '0', value: 'Hello', filename: 'test.txt' }],
}: {
  variables?: string
  map?: string
  files?: Part[]
} = {}) {
  const parts: Part[] = [
    { name: 'variables', value: variables },
    { name: 'map', value: map },
    ...files,
  ]
  return [
    ...parts.flatMap((part) => [
      `--${BOUNDARY}`,
      part.filename === undefined
        ? `Content-Disposition: form-data; name="${part.name}"`
        : `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: text/plain`,
      '',
      part.value,
    ]),
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
    delete serverOptions.doGraphqlRequest
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

  test('Should forward the files with their own names', async () => {
    const result = await testHandler(
      UPLOAD_HEADER,
      buildBody({
        variables: '{"input":{"files":[null,null]}}',
        map: '{"b":["variables.input.files.1"],"a":["variables.input.files.0"]}',
        files: [
          { name: 'a', value: 'A', filename: 'a.txt' },
          { name: 'b', value: 'B', filename: '' },
        ],
      }),
    )
    const formData = result.options.body as FormData
    expect(JSON.parse(formData.get('map') as string)).toEqual({
      0: ['variables.input.files.1'],
      1: ['variables.input.files.0'],
    })
    expect(formData.has('a')).toBe(false)
    expect(formData.has('b')).toBe(false)
    const first = formData.get('0') as File
    expect(await first.text()).toBe('B')
    // Without a name, the file would be sent as a text field.
    expect(first.name).toBe('blob')
    expect(await (formData.get('1') as File).text()).toBe('A')
  })

  test('Should pass the form data to a custom doGraphqlRequest', async () => {
    serverOptions.doGraphqlRequest = vi.fn(() => Promise.resolve('custom'))
    fetchMock.raw.mockClear()
    expect(await testHandler(UPLOAD_HEADER)).toBe('custom')
    expect(fetchMock.raw).not.toHaveBeenCalled()
    const args = serverOptions.doGraphqlRequest.mock.calls[0][0]
    expect(args).toMatchObject({
      operation: 'mutation',
      operationName: 'barfoo',
      operationDocument: 'Mutation',
      variables: { file: null },
    })
    expect(await (args.formData.get('0') as File).text()).toBe('Hello')
  })

  test('Should not forward a file that is not in the map', async () => {
    fetchMock.raw.mockClear()
    // A second "operations" field could replace the operation for GraphQL
    // servers that use the last field with the same name, such as PHP.
    const body = buildBody({
      files: [
        { name: '0', value: 'Hello', filename: 'test.txt' },
        { name: 'operations', value: '{"query":"{ foo }"}', filename: '' },
      ],
    })
    await expect(testHandler(UPLOAD_HEADER, body)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })

  test.each([
    ['{"0":["query"]}'],
    ['{"0":["operationName"]}'],
    ['{"0":["variables"]}'],
    ['{"0":["variables."]}'],
    ['{"0":["variables.other"]}'],
    ['{"0":["variables.__proto__"]}'],
    ['{"0":["variables.file.0"]}'],
    ['{"0":["variables.file","variables.file"]}'],
    ['{"0":[]}'],
    ['{"0":"variables.file"}'],
    ['{"1":["variables.file"]}'],
    ['{"variables":["variables.file"]}'],
    ['[]'],
    ['null'],
    ['{"0":'],
  ])('Should refuse an invalid map: %s', async (map) => {
    fetchMock.raw.mockClear()
    await expect(
      testHandler(UPLOAD_HEADER, buildBody({ map })),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })

  test('Should forward a file with several paths', async () => {
    const result = await testHandler(
      UPLOAD_HEADER,
      buildBody({
        variables: '{"a":null,"input":{"b":null}}',
        map: '{"0":["variables.a","variables.input.b"]}',
      }),
    )
    const formData = result.options.body as FormData
    expect(JSON.parse(formData.get('map') as string)).toEqual({
      0: ['variables.a', 'variables.input.b'],
    })
    expect(await (formData.get('0') as File).text()).toBe('Hello')
  })

  test('Should refuse two files for the same path', async () => {
    fetchMock.raw.mockClear()
    const body = buildBody({
      map: '{"0":["variables.file"],"1":["variables.file"]}',
      files: [
        { name: '0', value: 'A', filename: 'a.txt' },
        { name: '1', value: 'B', filename: 'b.txt' },
      ],
    })
    await expect(testHandler(UPLOAD_HEADER, body)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(fetchMock.raw).not.toHaveBeenCalled()
  })

  test('Should refuse a map for a variable that is not null', async () => {
    await expect(
      testHandler(UPLOAD_HEADER, buildBody({ variables: '{"file":"foo"}' })),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test('Should refuse two files with the same name', async () => {
    const body = buildBody({
      files: [
        { name: '0', value: 'A', filename: 'a.txt' },
        { name: '0', value: 'B', filename: 'b.txt' },
      ],
    })
    await expect(testHandler(UPLOAD_HEADER, body)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  test('Should refuse a request without a map', async () => {
    const body = [
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="variables"',
      '',
      '{"file":null}',
      `--${BOUNDARY}--`,
      '',
    ].join('\r\n')
    await expect(testHandler(UPLOAD_HEADER, body)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  test('Should forward a request without files', async () => {
    const result = await testHandler(
      UPLOAD_HEADER,
      buildBody({ map: '{}', files: [] }),
    )
    const formData = result.options.body as FormData
    expect(formData.get('map')).toBe('{}')
    expect([...formData.keys()]).toEqual(['operations', 'map'])
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
        testHandler(UPLOAD_HEADER, buildBody({ variables })),
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
