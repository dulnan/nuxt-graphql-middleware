import { describe, expect, test } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { ModuleHelper } from '../../src/build/ModuleHelper'

function matchesImportPattern(patterns: string[], filePath: string): boolean {
  const helper = {
    options: { autoImportPatterns: patterns },
    resolvers: { src: createResolver('/project/app') },
  }
  return ModuleHelper.prototype.matchesImportPattern.call(
    helper as unknown as ModuleHelper,
    filePath,
  )
}

describe('ModuleHelper.matchesImportPattern', () => {
  const patterns = [
    '/project/**/*.{gql,graphql}',
    '/project/app/**/*.{gql,graphql}',
    '!node_modules',
  ]

  test('matches files of the include patterns', () => {
    expect(matchesImportPattern(patterns, '/project/app/query.graphql')).toBe(
      true,
    )
    expect(matchesImportPattern(patterns, '/project/layers/a/b.gql')).toBe(true)
  })

  test('does not match files outside the include patterns', () => {
    expect(matchesImportPattern(patterns, '/project/app/query.txt')).toBe(false)
    expect(matchesImportPattern(patterns, '/other/query.graphql')).toBe(false)
  })

  test('resolves exclude patterns relative to the source directory', () => {
    expect(
      matchesImportPattern(patterns, '/project/app/node_modules/a/b.graphql'),
    ).toBe(false)
  })

  test('matches literal file paths', () => {
    expect(
      matchesImportPattern(['/some/file.graphql'], '/some/file.graphql'),
    ).toBe(true)
  })
})
