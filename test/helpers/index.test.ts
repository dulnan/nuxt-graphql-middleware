import path from 'path'
import fs from 'fs'
import { describe, expect, test, vi } from 'vitest'
import {
  defaultOptions,
  inlineFragments,
  validateOptions,
  getSchemaPath,
} from '../../src/helpers'

vi.mock('./../../src/codegen.ts', () => {
  return {
    generateSchema: () => {
      return Promise.resolve()
    },
  }
})

vi.mock('@nuxt/kit', () => {
  return {
    useLogger: () => {
      return {
        error: () => {},
      }
    },
  }
})

describe('defaultOptions', () => {
  test('Provides sane defaults', () => {
    expect(defaultOptions.autoImportPatterns).toEqual([
      '**/*.{gql,graphql}',
      '!node_modules',
    ])

    expect(defaultOptions.downloadSchema).toEqual(true)
    expect(defaultOptions.schemaPath).toEqual('./schema.graphql')
    expect(defaultOptions.serverApiPrefix).toEqual('/api/graphql_middleware')
    expect(
      defaultOptions.graphqlEndpoint,
      'Should be falsy so that an error is thrown during build.',
    ).toBeFalsy()

    expect(defaultOptions.debug).toBeFalsy()
    expect(defaultOptions.documents?.length).toEqual(0)
  })
})

describe('inlineFragments', () => {
  test('Inlines fragments', async () => {
    const source = await fs.promises
      .readFile(path.resolve(__dirname, './query.graphql'))
      .then((v) => v.toString())
    const result = inlineFragments(source, () => {
      return path.resolve(__dirname, './fragment.graphql')
    })

    expect(result).toMatchSnapshot()
  })
})

describe('validateOptions', () => {
  test('Throws an error if GraphQL endpoint is missing.', () => {
    expect(() => validateOptions({})).toThrowError('Missing graphqlEndpoint')
  })

  test('Returns successfully for a valid configuration.', () => {
    expect(validateOptions({ graphqlEndpoint: '/graphql' })).toBeFalsy()
  })
})

describe('getSchemaPath', () => {
  test('Throws an error if the schema path is invalid', async () => {
    const result = await getSchemaPath(
      { downloadSchema: false },
      () => '/place-that-does-not-exist',
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
})
