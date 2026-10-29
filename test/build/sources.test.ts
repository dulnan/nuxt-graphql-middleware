import { describe, expect, test } from 'vitest'
import type { GeneratorOutput } from 'graphql-typescript-deluxe'
import sources from '../../src/build/templates/definitions/sources'
import type { Collector } from '../../src/build/Collector'
import type { ModuleHelper } from '../../src/build/ModuleHelper'

function buildSources(root: string, filePath: string): string {
  const output = {
    getCollectedOperations: () => [
      { filePath, operationType: 'query', graphqlName: 'foo' },
    ],
  } as unknown as GeneratorOutput
  const helper = { paths: { root } } as unknown as ModuleHelper
  return sources.build!(output, helper, {} as Collector)
}

describe('sources template', () => {
  test('paths are relative to the root directory', () => {
    expect(
      buildSources('/project', '/project/app/query.foo.graphql'),
    ).toContain(`query_foo: 'app/query.foo.graphql'`)
  })

  test('Windows paths are relative to the root directory', () => {
    expect(
      buildSources('D:/project', 'D:/project/app/query.foo.graphql'),
    ).toContain(`query_foo: 'app/query.foo.graphql'`)
  })
})
