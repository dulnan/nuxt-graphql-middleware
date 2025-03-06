import path from 'path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { getSchemaPath } from '../../src/helpers'
const schemaPath = path.resolve(__dirname, './../../schema.graphql')

vi.mock('./../../src/codegen/index', async () => {
  const codegen: any = await vi.importActual('./../../src/codegen/index')
  return {
    ...codegen,
    generateSchema: () => {
      return Promise.resolve()
    },
  }
})

describe('getSchemaPath', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  test('Throws an error if the schema path is invalid', async () => {
    const result = await getSchemaPath(
      schemaPath,
      { downloadSchema: false, graphqlEndpoint: '' },
      () => '/some-invalid-schema-path',
    ).catch((e) => e)

    expect(result).toMatchSnapshot()
  })

  test('Throws an error if the schema should be downloaded but no endpoint is defined', async () => {
    const result = await getSchemaPath(
      schemaPath,
      { downloadSchema: true, graphqlEndpoint: '' },
      () => '',
    ).catch((e) => e)

    expect(result).toMatchSnapshot()
  })

  test('Returns the destination if the path is valid', async () => {
    const result = await getSchemaPath(
      schemaPath,
      { downloadSchema: false, graphqlEndpoint: '' },
      () => schemaPath,
    ).catch((e) => e)

    expect(result.schemaPath).toEqual(schemaPath)
  })
})
