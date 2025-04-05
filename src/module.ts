import { fileURLToPath } from 'url'
import { defineNuxtModule, useNuxt } from '@nuxt/kit'
import { name, version } from '../package.json'
import { defaultOptions } from './helpers'
import { Collector } from './module/Collector'
import { SchemaProvider } from './module/SchemaProvider'
import type { ModuleOptions } from './module/types/options'
import { ModuleHelper } from './module/ModuleHelper'
import { TEMPLATES } from './module/templates'
import { DevModeHandler } from './module/DevModeHandler'
import { ModuleContext } from './module/ModuleContext'
import type { OperationResponseError } from './runtime/types'
import type { HookResult } from 'nuxt/schema'

export type { GraphqlMiddlewareServerOptions } from './runtime/types'
export type { ModuleOptions }

const CONTEXT_KEY = '_nuxt_graphql_middleware'

export function useGraphqlModuleContext(): ModuleContext
export function useGraphqlModuleContext(options: {
  nullOnMissing: true
}): ModuleContext | null

/**
 * Get the nuxt-graphql-middleware module context helper.
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '>=3.15.0',
    },
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    // =========================================================================
    // Helper, GraphQL schema and documents
    // =========================================================================

    const helper = new ModuleHelper(nuxt, import.meta.url, passedOptions)

    const schemaProvider = new SchemaProvider(helper)
    await schemaProvider.init()

    const collector = new Collector(schemaProvider.getSchema(), helper)

    const moduleContext = new ModuleContext(schemaProvider, collector)
    nuxt._nuxt_graphql_middleware = moduleContext

    // =========================================================================
    // Runtime Config, App Config, Hacks
    // =========================================================================

    nuxt.options.appConfig.graphqlMiddleware = {
      clientCacheEnabled: !!helper.options.clientCache?.enabled,
      clientCacheMaxSize: helper.options.clientCache?.maxSize ?? 100,
    }

    nuxt.options.runtimeConfig.graphqlMiddleware = {
      graphqlEndpoint: helper.options.graphqlEndpoint || '',
    }

    helper.transpile(fileURLToPath(new URL('./runtime', import.meta.url)))
    helper.inlineNitroExternals(helper.resolvers.module.resolve('./runtime'))
    helper.inlineNitroExternals(helper.paths.moduleBuildDir)
    helper.inlineNitroExternals(helper.paths.moduleTypesDir)

    // =========================================================================
    // Aliases
    // =========================================================================

    helper.addAlias('#nuxt-graphql-middleware', helper.paths.moduleBuildDir)
    helper.addAlias('#graphql-operations', helper.paths.moduleTypesDir)

    // =========================================================================
    // Plugins
    // =========================================================================

    helper.addPlugin('./runtime/plugins/provideState')

    if (helper.isDev && helper.options.errorOverlay) {
      helper.addPlugin('./runtime/plugins/devMode')
    }

    // =========================================================================
    // Server Handlers
    // =========================================================================

    helper.addServerHandler('query', '/query/:name', 'get')
    helper.addServerHandler('mutation', '/mutation/:name', 'post')

    if (helper.options.enableFileUploads) {
      helper.addServerHandler('upload', '/upload/:name', 'post')
    }

    if (helper.isDev) {
      helper.addServerHandler('debug', '/debug', 'get')
    }

    // =========================================================================
    // Composables & Server Utils
    // =========================================================================

    if (helper.options.includeComposables) {
      helper.addComposable('useGraphqlQuery')
      helper.addComposable('useGraphqlMutation')
      helper.addComposable('useGraphqlState')
      helper.addComposable('useAsyncGraphqlQuery')

      if (helper.options.enableFileUploads) {
        helper.addComposable('useGraphqlUploadMutation')
      }

      helper.addServerUtil('useGraphqlQuery')
      helper.addServerUtil('useGraphqlMutation')
      helper.addServerUtil('doGraphqlRequest')
    }

    // =========================================================================
    // Templates
    // =========================================================================

    TEMPLATES.forEach((template) => {
      if (template.type === 'static') {
        // Static templates only need to be generated once.
        helper.addTemplate(template)
      } else {
        // Templates that require GraphQL documents to generate the contents.
        collector.addTemplate(template)
      }
    })

    // =========================================================================
    // Build
    // =========================================================================

    helper.applyBuildConfig()

    // This is called once all modules have been initialised.
    nuxt.hooks.hookOnce('modules:done', async () => {
      // Let other modules add additional documents.
      await nuxt.hooks.callHook('nuxt-graphql-middleware:init', moduleContext)

      // Initalise the documents.
      await collector.init()
    })

    // =========================================================================
    // Dev Mode
    // =========================================================================

    if (!helper.isDev) {
      return
    }

    const devModeHandler = new DevModeHandler(
      nuxt,
      schemaProvider,
      collector,
      helper,
    )
    devModeHandler.init()
  },
})

declare module '#app' {
  interface RuntimeNuxtHooks {
    /**
     * Emitted when any GraphQL response contains errors.
     */
    'nuxt-graphql-middleware:errors': (
      errors: OperationResponseError,
    ) => HookResult
  }
}

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    /**
     * Emitted when GraphQL operations have been updated.
     */
    'nuxt-graphql-middleware:reload': { operations: string[] }
  }
}

declare module '@nuxt/schema' {
  interface AppConfig {
    graphqlMiddleware: {
      /**
       * Whether the client cache is enabled.
       */
      clientCacheEnabled: boolean

      /**
       * The max number of items in the cache.
       */
      clientCacheMaxSize: number
    }
  }

  interface Nuxt {
    /**
     * The nuxt-graphql-middleware module context.
     */
    _nuxt_graphql_middleware?: ModuleContext
  }

  interface NuxtHooks {
    /**
     * Called once right before the documents are initialised.
     *
     * Use this hook to add any additional documents based on for example the parsed schema.
     *
     * @example
     *
     * ```typescript`
     * export default defineNuxtConfig({
     *   hooks: {
     *     'nuxt-graphql-middleware:init': (ctx) => {
     *       if (ctx.schemaHasType('Comment')) {
     *         ctx.addDocument(
     *           'queryFromHook',
     *           `query loadComments { author subject date body }`
     *         )
     *       }
     *     },
     *   },
     * })
     * ```
     */
    'nuxt-graphql-middleware:init': (ctx: ModuleContext) => void | Promise<void>
  }
}
