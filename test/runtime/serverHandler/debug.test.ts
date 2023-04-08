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
          <html>
            <head>
          <style>
          textarea {
          display: block;
            width: 100%;
          }
          </style>
            </head>
            <body><h1>nuxt-graphql-middleware debug</h1><h2>query</h2><h3>foobar</h3><a href=\\"/nuxt-graphql-middleware/query/foobar\\">/nuxt-graphql-middleware/query/foobar</a><textarea rows=\\"10\\">query foobar {
        getUserId
      }</textarea><h2>mutation</h2><h3>barfoo</h3><a href=\\"/nuxt-graphql-middleware/mutation/barfoo\\">/nuxt-graphql-middleware/mutation/barfoo</a><textarea rows=\\"10\\">mutation barfoo {
        login
      }</textarea></body>
          </html>
          "
    `)
  })
})
