import { describe, expect, test } from 'vitest'
import { loadSchema } from '@graphql-tools/load'
import { validateDocuments } from '../../src/helpers'

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
