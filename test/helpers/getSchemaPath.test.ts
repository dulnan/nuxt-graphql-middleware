import path from 'path'
import { describe, expect, test, vi } from 'vitest'
import { getSchemaPath } from '../../src/helpers'
const schemaPath = path.resolve(__dirname, './../../playground/schema.graphql')

vi.mock('./../../src/codegen.ts', async () => {
  const codegen: any = await vi.importActual('./../../src/codegen.ts')
  return {
    ...codegen,
    generateSchema: () => {
      return Promise.resolve()
    },
  }
})

describe('getSchemaPath', () => {
  test('Throws an error if the schema path is invalid', async () => {
    const result = await getSchemaPath(
      { downloadSchema: false },
      () => '/some-invalid-schema-path',
    ).catch((e) => e)

    expect(result).toMatchSnapshot()
  })

  test('Throws an error if the schema should be downloaded but no endpoint is defined', async () => {
    const result = await getSchemaPath(
      { downloadSchema: true },
      () => '',
    ).catch((e) => e)

    expect(result).toMatchSnapshot()
  })

  test('Returns the destination if the path is valid', async () => {
    const dest = path.resolve(__dirname, './schema.graphql')
    const result = await getSchemaPath(
      { downloadSchema: false },
      () => dest,
    ).catch((e) => e)

    expect(result).toEqual(dest)
  })

  test('Returns the destination if the schema could be downloaded', async () => {
    const dest = path.resolve(__dirname, './schema.graphql')
    const result = await getSchemaPath(
      { downloadSchema: true, graphqlEndpoint: 'http://localhost/graphql' },
      () => dest,
    ).catch((e) => e)

    expect(result).toEqual(dest)
  })

  test('Calls the graphqlEndpoint method', async () => {
    const dest = path.resolve(__dirname, './schema.graphql')
    const result = await getSchemaPath(
      {
        downloadSchema: true,
        graphqlEndpoint: () => 'http://localhost/graphql',
      },
      () => dest,
    ).catch((e) => e)

    expect(result).toEqual(dest)
  })
})
