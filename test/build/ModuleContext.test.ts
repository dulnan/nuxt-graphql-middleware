import { describe, expect, test, vi } from 'vitest'
import { ModuleContext } from '../../src/build/ModuleContext'
import type { Collector } from '../../src/build/Collector'
import type { SchemaProvider } from '../../src/build/SchemaProvider'

function createContext() {
  const addHookFile = vi.fn()
  const collector = { addHookFile } as unknown as Collector
  const context = new ModuleContext({} as SchemaProvider, collector)
  return { context, addHookFile }
}

/**
 * @see https://github.com/dulnan/nuxt-graphql-middleware/issues/86
 */
describe('ModuleContext.addImportFile', () => {
  test.each([
    ['/home/user/project/query.graphql', '/home/user/project/query.graphql'],
    ['D:/repos/project/query.graphql', 'D:/repos/project/query.graphql'],
    ['D:\\repos\\project\\query.gql', 'D:/repos/project/query.gql'],
  ])('accepts the absolute path %s', (filePath, expected) => {
    const { context, addHookFile } = createContext()
    context.addImportFile(filePath)
    expect(addHookFile).toHaveBeenCalledWith(expected)
  })

  test.each(['query.graphql', './query.graphql', 'C:query.graphql'])(
    'rejects the relative path %s',
    (filePath) => {
      const { context } = createContext()
      expect(() => context.addImportFile(filePath)).toThrow(
        'must be an absolute path',
      )
    },
  )
})
