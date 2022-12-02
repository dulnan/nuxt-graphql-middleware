import path from 'path'
import { describe, expect, test } from 'vitest'
import { autoImportDocuments } from '../../src/helpers'

describe('autoImportDocuments', () => {
  const srcDir = path.resolve(__dirname, './../../playground')
  const resolver = () => srcDir

  test('Returns an empty array if no pattern is provided.', async () => {
    expect(await autoImportDocuments([], resolver)).toEqual([])
  })

  test('Returns all available document contents.', async () => {
    expect(await autoImportDocuments([], resolver)).toMatchSnapshot()
    const result = await autoImportDocuments(['**/*.graphql'], resolver)
    const data = JSON.stringify(result)
    expect(data).not.toContain('schema.graphql')
    expect(data).not.toContain('schema.gql')
  })

  test('Does not include the GraphQL schema file.', async () => {
    const result = await autoImportDocuments(['**/*.graphql'], resolver)
    const data = JSON.stringify(result)
    expect(data).not.toContain('schema.graphql')
    expect(data).not.toContain('schema.gql')
  })
})
