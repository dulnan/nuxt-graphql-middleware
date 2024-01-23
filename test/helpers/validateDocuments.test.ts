import path from 'path'
import { describe, expect, test, vi } from 'vitest'
import { loadSchema } from '@graphql-tools/load'
import { validateDocuments } from '../../src/helpers'

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

describe('validateDocuments', () => {
  test('Validates documents', async () => {
    const schemaContent = `
    type Query {
      getText: Text
    }

    type Text {
      value: String
    }
    `

    const schema = await loadSchema(schemaContent, { loaders: [] })

    expect(
      validateDocuments(
        schema,
        [
          {
            content: `query myQuery {
        getText {
          value
        }
      }`,
          },
        ],
        '/foobar',
      )[0],
    ).property('isValid', true)

    expect(
      validateDocuments(
        schema,
        [
          {
            content: `query myQuery {
        getText {
          invalidField
        }
      }`,
          },
        ],
        '/foobar',
      )[0],
    ).property('isValid', false)

    expect(
      validateDocuments(
        schema,
        [
          {
            content: `qurye syntaxError {}`,
          },
        ],
        '/foobar',
      )[0],
    ).property('isValid', false)
  })

  test('Formats document content', async () => {
    const schemaContent = `
    type Query {
      getText: Text
    }

    type Text {
      value: String
    }
    `

    const schema = await loadSchema(schemaContent, { loaders: [] })

    expect(
      validateDocuments(
        schema,
        [
          {
            content: `query myQuery {
getText {
        value
        }      }`,
          },
        ],
        '/foobar',
      )[0].content,
    ).toMatchInlineSnapshot(`
      "query myQuery {
        getText {
          value
        }
      }"
    `)
  })
})
