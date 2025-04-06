import { useNuxtApp } from '#imports'
import type { NuxtApp } from '#app'
import type { GraphqlMiddlewareState } from './../types'

export const useGraphqlState = function (
  providedApp?: NuxtApp,
): GraphqlMiddlewareState | null {
  try {
    const app = providedApp || useNuxtApp()
    if (app.$graphqlState) {
      return app.$graphqlState
    }
  } catch {
    // Noop.
  }
  return null
}
