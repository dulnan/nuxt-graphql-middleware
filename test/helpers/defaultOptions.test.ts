import { describe, expect, test } from 'vitest'
import { defaultOptions } from '../../src/build/helpers'

describe('defaultOptions', () => {
  test('Provides sane defaults', () => {
    expect(defaultOptions.autoImportPatterns).toBeUndefined()

    expect(defaultOptions.downloadSchema).toEqual(true)
    expect(defaultOptions.schemaPath).toEqual('~~/schema.graphql')
    expect(defaultOptions.serverApiPrefix).toEqual('/api/graphql_middleware')
    expect(
      defaultOptions.graphqlEndpoint,
      'Should be falsy so that an error is thrown during build.',
    ).toBeFalsy()

    expect(defaultOptions.debug).toBeFalsy()
    expect(defaultOptions.documents?.length).toEqual(0)
    expect(defaultOptions.bodySizeLimit).toEqual({
      mutation: 10 * 1024 * 1024,
      upload: 50 * 1024 * 1024,
    })
  })
})
