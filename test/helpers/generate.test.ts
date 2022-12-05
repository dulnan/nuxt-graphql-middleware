import path from 'path'
import { createResolver } from '@nuxt/kit'
import { describe, expect, test, vi } from 'vitest'
import stripAnsi from 'strip-ansi'
import { generate, logger } from '../../src/helpers'

describe('generate', () => {
  const srcDir = path.resolve(__dirname, './../../playground')
  const resolver = createResolver(srcDir).resolve
  const schemaPath = path.resolve(
    __dirname,
    './../../playground/schema.graphql',
  )

  test('Generates templates correctly for auto imported documents', async () => {
    expect(
      await generate(
        {
          documents: [],
          autoImportPatterns: ['**/*.graphql'],
        },
        schemaPath,
        resolver,
        srcDir,
      ),
    ).toMatchSnapshot()
  })

  test('Generates templates correctly for provided documents', async () => {
    expect(
      await generate(
        {
          documents: [
            `
            query one {
              users {
                id
              }
            }`,
            `
            mutation two($id: Int!) {
              deleteUser(id: $id)
            }`,
          ],
        },
        schemaPath,
        resolver,
        srcDir,
      ),
    ).toMatchSnapshot()
  })

  test('Renders a table with information about all documents.', async () => {
    let output = ''
    logger.log = (v) => {
      output += v
    }
    await generate(
      {
        documents: [
          `fragment user on User {
            id
          }`,
          `
            query one {
              users {
                id
              }
            }`,
          `
            mutation two($id: Int!) {
              deleteUser(id: $id)
            }`,
        ],
      },
      schemaPath,
      resolver,
      srcDir,
      true,
    )

    expect(stripAnsi(output)).toMatchSnapshot()
  })

  test('Renders a table with information about all documents with errors.', async () => {
    let output = ''
    logger.log = (v) => {
      output += v
    }
    await generate(
      {
        documents: [
          `fragment user on User {
            id
          `,
          `
            syntax error one {
              users {
                id
              }
            }`,
          `
            mutation two($id: Int) {
              deleteUser(id: $id)
            }`,
        ],
      },
      schemaPath,
      resolver,
      srcDir,
      true,
    )

    expect(stripAnsi(output)).toMatchSnapshot()
  })
})
