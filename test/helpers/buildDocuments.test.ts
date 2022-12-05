import path from 'path'
import { describe, expect, test } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { buildDocuments } from '../../src/helpers'

describe('buildDocuments', () => {
  const srcDir = path.resolve(__dirname, './../../playground')
  const resolver = createResolver(srcDir).resolve

  test('Reads and build the documents by pattern', async () => {
    expect(
      await buildDocuments([], ['**/*.graphql'], resolver).then((v) => {
        return v.map((doc) => {
          doc.filename = path.basename(doc.filename!)
          return doc
        })
      }),
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
      ),
    ).toMatchSnapshot()
  })
})
