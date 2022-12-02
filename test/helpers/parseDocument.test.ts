import { describe, expect, test } from 'vitest'
import { parseDocument } from '../../src/helpers'

describe('parseDocument', () => {
  test('Parses a GraphQL document and sets the correct name', () => {
    const content = `
    query foobar {
      one
      two
    }
    `
    const result = parseDocument(
      { content, filename: '/foobar/queries/foo.graphql' },
      '/foobar',
    )
    expect(result?.loc?.source.name).toEqual('queries/foo.graphql')
  })
})
