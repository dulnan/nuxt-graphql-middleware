import path from 'path'
import { describe, expect, test, vi } from 'vitest'
import stripAnsi from 'strip-ansi'
import { generate, logger } from '../../src/helpers'
import { Collector } from '../../src/module/Collector'

// Inside vitest, the resolveAlias function does not know about the '~' alias of nuxt.
vi.mock('@nuxt/kit', async () => {
  const kit: any = await vi.importActual('@nuxt/kit')

  return {
    ...kit,
    resolveAlias: (v: string) => {
      return kit.resolveAlias(v, {
        '~': path.resolve(__dirname, './../../playground'),
      })
    },
  }
})

describe('generate', () => {
  const srcDir = path.resolve(__dirname, './../../playground')
  const schemaPath = path.resolve(__dirname, './../../schema.graphql')

  test('Generates templates correctly for auto imported documents', async () => {
    const collector = new Collector({
      srcDir,
      schemaPath,
      patterns: [
        './app/pages/**/*.graphql',
        './app/components/**/*.graphql',
        './app/layouts/**/*.graphql',
        './server/**/*.graphql',
      ],
    })
    await collector.init()
    const result = await generate(
      collector,
      {
        graphqlEndpoint: '',
        documents: [],
        autoImportPatterns: [
          './app/pages/**/*.graphql',
          './app/components/**/*.graphql',
          './app/layouts/**/*.graphql',
          './server/**/*.graphql',
        ],
      },
      schemaPath,
      srcDir,
    )
    expect(result.documents.filter((v) => v.errors?.length)).toEqual([])
    expect(result.hasErrors).toBeFalsy()
    expect(result.documents).toHaveLength(19)
    expect(result.templates).toHaveLength(3)

    const a = result.templates.find(
      (t) => t.filename === 'graphql-documents.mjs',
    )
    const b = result.templates.find(
      (t) => t.filename === 'graphql-operations.d.ts',
    )
    const c = result.templates.find(
      (t) => t.filename === 'nuxt-graphql-middleware/generated-types.d.ts',
    )
    expect(result.hasErrors).toBeFalsy()
    expect(result.templates.map((v) => v.filename)).toMatchInlineSnapshot(`
      [
        "graphql-documents.mjs",
        "graphql-operations.d.ts",
        "nuxt-graphql-middleware/generated-types.d.ts",
      ]
    `)
    expect(a).toMatchSnapshot(a?.filename)
    expect(b).toMatchSnapshot(b?.filename)
    expect(c).toMatchSnapshot(c?.filename)
  })

  test('Generates templates correctly for auto imported documents automatic fragment imports', async () => {
    const collector = new Collector({
      srcDir,
      schemaPath,
      patterns: ['./app/test-queries/auto-inline/**/*.graphql'],
    })
    await collector.init()
    const result = await generate(
      collector,
      {
        graphqlEndpoint: '',
        documents: [],
        autoImportPatterns: ['./app/test-queries/auto-inline/**/*.graphql'],
      },
      schemaPath,
      srcDir,
    )
    expect(result.hasErrors).toBeFalsy()
    expect(result.documents).toHaveLength(4)
    expect(result.templates).toHaveLength(3)

    const a = result.templates.find(
      (t) => t.filename === 'graphql-documents.mjs',
    )
    const b = result.templates.find(
      (t) => t.filename === 'graphql-operations.d.ts',
    )
    const c = result.templates.find(
      (t) => t.filename === 'nuxt-graphql-middleware/generated-types.d.ts',
    )
    expect(result.hasErrors).toBeFalsy()
    expect(result.templates.map((v) => v.filename)).toMatchInlineSnapshot(`
      [
        "graphql-documents.mjs",
        "graphql-operations.d.ts",
        "nuxt-graphql-middleware/generated-types.d.ts",
      ]
    `)
    expect(a).toMatchSnapshot(a?.filename)
    expect(b).toMatchSnapshot(b?.filename)
    expect(c).toMatchSnapshot(c?.filename)
  })

  test('Generates templates correctly for provided documents', async () => {
    const collector = new Collector(
      {
        srcDir,
        schemaPath,
        patterns: [],
      },
      [
        `
            query one {
              users {
                id
              }
            }`,
        `
            mutation two($id: Int!) {
              deleteUser(id: $id)
            }`,
      ],
    )
    await collector.init()
    expect(
      await generate(
        collector,
        {
          graphqlEndpoint: '',
        },
        schemaPath,
        srcDir,
      ),
    ).toMatchSnapshot()
  })

  test('Renders a table with information about all documents.', async () => {
    let output = ''
    logger.log = (v) => {
      output += v
    }
    const collector = new Collector(
      {
        srcDir,
        schemaPath,
        patterns: [],
      },
      [
        `fragment user on User {
            id
          }`,
        `
            query one {
              users {
                id
              }
            }`,
        `
            mutation two($id: Int!) {
              deleteUser(id: $id)
            }`,
      ],
    )
    await collector.init()
    await generate(
      collector,
      {
        graphqlEndpoint: '',
      },
      schemaPath,
      srcDir,
      true,
    )

    expect(stripAnsi(output)).toMatchSnapshot()
  })

  test('Renders a table with information about all documents with errors.', async () => {
    let output = ''
    logger.log = (v) => {
      output += v
    }
    const collector = new Collector(
      {
        srcDir,
        schemaPath,
        patterns: [],
      },
      [
        `fragment user on User {
            id
          `,
        `
            syntax error one {
              users {
                id
              }
            }`,
        `
            mutation two($id: Int) {
              deleteUser(id: $id)
            }`,
      ],
    )
    await collector.init()
    await generate(
      collector,
      {
        graphqlEndpoint: '',
      },
      schemaPath,
      srcDir,
      true,
    )

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
