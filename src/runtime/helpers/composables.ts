import type { NuxtApp } from '#app'
import type { AppConfig } from 'nuxt/schema'
import { GraphqlMiddlewareCache } from './ClientCache'
import {
  clientCacheEnabledAtBuild,
  importMetaServer,
} from '#nuxt-graphql-middleware/config'

// Re-export shared types that don't depend on #app
export {
  type GraphqlComposableOptions,
  type GetQueryArgs,
  type GetMutationArgs,
  type GetQueryResult,
  type GetMutationResult,
  type QueryObjectArgs,
  type MutationObjectArgs,
  type PickFrom,
  type KeysOf,
  encodeContext,
} from './shared-types'

export function getOrCreateClientCache(
  app: NuxtApp,
  config: AppConfig,
): GraphqlMiddlewareCache | undefined {
  if (importMetaServer || !clientCacheEnabledAtBuild) {
    return
  }

  if (!config.graphqlMiddleware.clientCacheEnabled) {
    return
  }

  if (!app.$graphqlCache) {
    app.$graphqlCache = new GraphqlMiddlewareCache(
      config.graphqlMiddleware.clientCacheMaxSize,
    )
  }

  return app.$graphqlCache
}
