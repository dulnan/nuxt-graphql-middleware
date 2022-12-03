import { fileURLToPath } from 'node:url'
import { setup, $fetch, useTestContext } from '@nuxt/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { useNuxt } from '@nuxt/kit'
import type { GraphqlMiddlewareConfig } from './../src/types'

describe('nuxt-graphql-middleware', async () => {
  const graphqlMiddleware: GraphqlMiddlewareConfig = {
    downloadSchema: false,
  }
  const nuxtConfig: any = {
    graphqlMiddleware,
  }
  await setup({
    server: true,
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
    nuxtConfig,
  })

  test('Performs a GraphQL query.', async () => {
    const data = await $fetch('/api/graphql_middleware/query/users')
    expect(data).toMatchSnapshot()
  })

  test('Performs a GraphQL mutation.', async () => {
    const data = await $fetch('/api/graphql_middleware/mutation/deleteUser', {
      method: 'post',
      body: {
        id: 1,
      },
    })
    expect(data).toMatchSnapshot()
  })

  test('Does not watch files in build mode', async () => {
    const nitroCallHook = vi.fn()
    const ctx = useTestContext()
    ctx.nuxt!.callHook('nitro:build:before', {
      hooks: { callHook: nitroCallHook },
    } as any)
    await ctx.nuxt!.callHook('builder:watch', 'change', 'foobar.js')
    expect(nitroCallHook).not.toHaveBeenCalled()
  })
})
