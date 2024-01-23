import { describe, expect, test, vi } from 'vitest'
import eventHandler from './../../../src/runtime/serverHandler/debug'

vi.mock('#graphql-documents', () => {
  return {
    documents: {
      query: {
        foobar: `query foobar {
  getUserId
}`,
      },
      mutation: {
        barfoo: `mutation barfoo {
  login
}`,
      },
    },
  }
})

vi.mock('#imports', () => {
  return {
    useRuntimeConfig: () => {
      return {
        public: {
          'nuxt-graphql-middleware': {
            serverApiPrefix: '/nuxt-graphql-middleware',
          },
        },
        graphqlMiddleware: {
          graphqlEndpoint: 'http//localhost/graphql',
        },
      }
    },
  }
})

describe('Debug Server Handler', () => {
  test('Should render debug information correctly.', () => {
    expect(eventHandler({} as any)).toMatchInlineSnapshot(`
      "
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: sans-serif;
                }
                textarea {
                  display: block;
                  width: 100%;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                td {
                  vertical-align: top;
                  border-bottom: 1px solid;
                  padding: 0.5rem 0;
              }
              </style>
            </head>
            <body><h1>nuxt-graphql-middleware debug</h1><table><tbody><tr><td style="font-size: 1.5rem">query</td><td>
              <strong style="font-size: 1.5rem">foobar</strong><br>
              <a href="/nuxt-graphql-middleware/query/foobar">/nuxt-graphql-middleware/query/foobar</a>
            </td><td style="width: 30%"><textarea readonly rows="5">query foobar {
        getUserId
      }</textarea></td></tr><tr><td style="font-size: 1.5rem">mutation</td><td>
              <strong style="font-size: 1.5rem">barfoo</strong><br>
              <a href="/nuxt-graphql-middleware/mutation/barfoo">/nuxt-graphql-middleware/mutation/barfoo</a>
            </td><td style="width: 30%"><textarea readonly rows="5">mutation barfoo {
        login
      }</textarea></td></tr></tbody></table></body>
          </html>"
    `)
  })
})
