import { loadNuxtConfig } from '@nuxt/kit'
import type { GraphqlMiddlewareConfig } from './../../../types'
import { useRuntimeConfig } from '#imports'

let moduleConfig: GraphqlMiddlewareConfig | null = null

/**
 * Due to nuxt's architecture, we have to manually load the runtime configuration.
 * This is only done for the first time and we cache the config locally.
 */
export function getModuleConfig(): Promise<GraphqlMiddlewareConfig> {
  // Already loaded, return it.
  if (moduleConfig) {
    return Promise.resolve(moduleConfig)
  }

  // Load the configuration.
  const { graphqlMiddleware } = useRuntimeConfig()
  return loadNuxtConfig({
    cwd: graphqlMiddleware.rootDir,
  }).then((v: any) => {
    moduleConfig = v.graphqlMiddleware
    return v.graphqlMiddleware
  })
}
