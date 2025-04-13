import { useNuxt } from '@nuxt/kit'
import type { ModuleContext } from './build/ModuleContext'

const CONTEXT_KEY = '_nuxt_graphql_middleware'

export function useGraphqlModuleContext(): ModuleContext
export function useGraphqlModuleContext(options: {
  nullOnMissing: true
}): ModuleContext | null

/**
 * Get the nuxt-graphql-middleware module context helper.
 *
 * This util can only be used inside modules.
 *
 * @param options - The options.
 * @param options.nullOnMissing - If true, returns null if the context is missing.
 *
 * @returns The nuxt-graphql-middleware module context.
 */
export function useGraphqlModuleContext(options?: {
  nullOnMissing?: boolean
}): ModuleContext | null {
  const nuxt = useNuxt()
  const context = nuxt[CONTEXT_KEY]

  if (!context) {
    if (options?.nullOnMissing) {
      return null
    }

    throw new Error(
      'nuxt-graphql-middleware context is not available. Make sure you call this method only after nuxt-graphql-middleware has been setup. If you call this in a module, make sure your module is declared after nuxt-graphql-middleware in your `modules` Nuxt config.',
    )
  }

  return context
}
