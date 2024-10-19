import path from 'path'
import { describe, expect, test, vi } from 'vitest'
import { createResolver, resolveAlias } from '@nuxt/kit'
import { buildDocuments } from '../../src/helpers'

// Inside vitest, the resolveAlias function does not know about the '~' alias of nuxt.
vi.mock('@nuxt/kit', async () => {
  const kit: any = await vi.importActual('@nuxt/kit')

  return {
    ...kit,
    resolveAlias: (v: string) => {
      return kit.resolveAlias(v, {
        '~': path.resolve(__dirname, './../../playground'),
      })
    },
  }
})

describe('buildDocuments', () => {
  const srcDir = path.resolve(__dirname, './../../playground')
  const resolver = createResolver(srcDir).resolve

  test('Reads and build the documents by pattern', async () => {
    expect(
      await buildDocuments([], ['./**/*.graphql'], resolver, false).then(
        (v) => {
          return v.map((doc) => {
            doc.filename = path.basename(doc.filename!)
            return doc
          })
        },
      ),
    ).toMatchSnapshot()
  })

  test('Reads and builds the documents from nuxt.config.ts', async () => {
    expect(
      await buildDocuments(
        [
          `query foobar {
        field
      }`,
        ],
        [],
        resolver,
        false,
      ),
    ).toMatchSnapshot()
  })
})
