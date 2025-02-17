import path from 'path'
import { describe, expect, test, vi } from 'vitest'
import { buildDocuments } from '../../src/helpers'
import { Collector } from '../../src/module/Collector'

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

  test('Reads and build the documents by pattern', async () => {
    const collector = new Collector({
      patterns: ['./**/*.graphql'],
      srcDir,
      schemaPath: '',
    })
    await collector.init()
    expect(
      await buildDocuments(collector).then((v) => {
        return v.map((doc) => {
          doc.filename = path.basename(doc.filename!)
          return doc
        })
      }),
    ).toMatchSnapshot()
  })

  test('Reads and builds the documents from nuxt.config.ts', async () => {
    const collector = new Collector(
      {
        patterns: ['./**/*.graphql'],
        srcDir,
        schemaPath: '',
      },
      [
        `query foobar {
        field
      }`,
      ],
    )
    await collector.init()
    expect(await buildDocuments(collector)).toMatchSnapshot()
  })
})
