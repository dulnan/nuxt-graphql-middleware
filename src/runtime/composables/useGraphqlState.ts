import { NuxtApp, useNuxtApp } from '#app'
import { GraphqlMiddlewareState } from './../../types'

export const useGraphqlState = function (
  providedApp?: NuxtApp,
): GraphqlMiddlewareState | null {
  try {
    const app = providedApp || useNuxtApp()
    if (app.$graphqlState) {
      return app.$graphqlState as GraphqlMiddlewareState
    }
  } catch (_e) {}
  return null
}
