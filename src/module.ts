import { fileURLToPath } from 'url'
import { addDevServerHandler, defineNuxtModule, installModule } from '@nuxt/kit'
import { name, version } from '../package.json'
import { defaultOptions } from './build/helpers'
import { Collector } from './build/Collector'
import { SchemaProvider } from './build/SchemaProvider'
import type { ModuleOptions } from './build/types/options'
import { ModuleHelper } from './build/ModuleHelper'
import { TEMPLATES } from './build/templates'
import { DevModeHandler } from './build/DevModeHandler'
import { ModuleContext } from './build/ModuleContext'
import type { OperationResponseError } from './runtime/types'
import type { HookResult } from 'nuxt/schema'
import type { BuildHookContext } from './build/types/hook'
import { createMcpDevHandler } from './build/dev-handler/mcp-handler'

export type { ModuleOptions }

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '>=3.17.0',
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

    // Expose dev server URL for MCP tools (dev only).
    const devServerUrl = helper.isDev
      ? `http://${nuxt.options.devServer.host || 'localhost'}:${nuxt.options.devServer.port || 3000}`
      : ''

    nuxt.options.runtimeConfig.graphqlMiddleware = {
      graphqlEndpoint: helper.options.graphqlEndpoint,
      devServerUrl,
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

    helper.addPlugin('provideState')

    if (helper.isDev && helper.options.errorOverlay) {
      helper.addPlugin('devMode')
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
    // Dev Mode
    // =========================================================================

    if (helper.isDev) {
      const devModeHandler = new DevModeHandler(
        nuxt,
        schemaProvider,
        collector,
        helper,
      )
      devModeHandler.init()
    }

    // =========================================================================
    // MCP
    // =========================================================================
    const isPlayground = process.env.PLAYGROUND_MODULE_BUILD

    // Only relevant for the playground.
    if (isPlayground) {
      await installModule('@nuxtjs/mcp-toolkit')
    }

    const mcpToolkitInstalled = nuxt.options.modules.some(
      (v) => v === '@nuxtjs/mcp-toolkit',
    )

    if (mcpToolkitInstalled) {
      // @ts-ignore The types are somehow not available in the playground build.
      nuxt.hook('mcp:definitions:paths', (paths) => {
        const mcpPath = helper.resolvers.module.resolve('./runtime/server/mcp')
        paths.handlers ||= []
        paths.handlers.push(mcpPath)
      })

      // MCP dev server handler - expose module data to MCP tools.
      addDevServerHandler({
        route: '/__nuxt_graphql_middleware/mcp',
        handler: createMcpDevHandler(collector, schemaProvider),
      })

      if (helper.isDev) {
        helper.addServerHandler('doRequest', '/do-request', 'post')
      }
    }

    // =========================================================================
    // Build
    // =========================================================================

    // This is called once all modules have been initialised.
    nuxt.hooks.hookOnce('modules:done', async () => {
      // Let other modules add additional documents.
      await nuxt.hooks.callHook('nuxt-graphql-middleware:init', moduleContext)

      // Initalise the documents.
      await collector.init()
    })

    helper.applyBuildConfig()
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

    /**
     * Called when building the state and templates.
     *
     * Generally this hook is called from within the builder:watch event, when
     * a GraphQL file change was detected.
     *
     * The received argument is the output from the graphql-typescript-deluxe
     * generator.
     */
    'nuxt-graphql-middleware:build': (
      ctx: BuildHookContext,
    ) => void | Promise<void>
  }
}
