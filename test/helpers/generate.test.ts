import path from 'path'
import { createResolver } from '@nuxt/kit'
import { describe, expect, test, vi } from 'vitest'
import stripAnsi from 'strip-ansi'
import { generate, logger } from '../../src/helpers'

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
  const resolver = createResolver(srcDir).resolve
  const schemaPath = path.resolve(
    __dirname,
    './../../playground/schema.graphql',
  )

  test('Generates templates correctly for auto imported documents', async () => {
    const result = await generate(
      {
        graphqlEndpoint: '',
        documents: [],
        autoImportPatterns: [
          './pages/**/*.graphql',
          './components/**/*.graphql',
          './layouts/**/*.graphql',
          './server/**/*.graphql',
        ],
      },
      schemaPath,
      resolver,
      srcDir,
    )
    expect(result.hasErrors).toBeFalsy()
    expect(result.documents).toHaveLength(18)
    expect(result.templates).toHaveLength(3)

    const possibleTemplates = [
      'graphql-documents.mjs',
      'graphql-operations.d.ts',
      'nuxt-graphql-middleware.d.ts',
    ]

    const a = result.templates.find(
      (t) => t.filename === 'graphql-documents.mjs',
    )
    const b = result.templates.find(
      (t) => t.filename === 'graphql-operations.d.ts',
    )
    const c = result.templates.find(
      (t) => t.filename === 'nuxt-graphql-middleware.d.ts',
    )
    expect(a).toMatchSnapshot()
    expect(b).toMatchSnapshot()
    expect(c).toMatchSnapshot()
  })

  test('Generates templates correctly for auto imported documents using autoInlineFragments', async () => {
    const result = await generate(
      {
        graphqlEndpoint: '',
        documents: [],
        autoImportPatterns: ['./test-queries/auto-inline/**/*.graphql'],
        autoInlineFragments: true,
      },
      schemaPath,
      resolver,
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
      (t) => t.filename === 'nuxt-graphql-middleware.d.ts',
    )
    expect(a).toMatchSnapshot()
    expect(b).toMatchSnapshot()
    expect(c).toMatchSnapshot()
  })

  test('Generates templates correctly for provided documents', async () => {
    expect(
      await generate(
        {
          graphqlEndpoint: '',
          documents: [
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
        },
        schemaPath,
        resolver,
        srcDir,
      ),
    ).toMatchSnapshot()
  })

  test('Renders a table with information about all documents.', async () => {
    let output = ''
    logger.log = (v) => {
      output += v
    }
    await generate(
      {
        graphqlEndpoint: '',
        documents: [
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
      },
      schemaPath,
      resolver,
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
    await generate(
      {
        graphqlEndpoint: '',
        documents: [
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
      },
      schemaPath,
      resolver,
      srcDir,
      true,
    )

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
