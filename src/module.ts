import { fileURLToPath } from 'url'
import { defineNuxtModule } from '@nuxt/kit'
import { name, version } from '../package.json'
import { defaultOptions } from './helpers'
import { Collector } from './module/Collector'
import type { HookResult } from 'nuxt/schema'
import type { OperationResponseError } from './runtime/types'
import { SchemaProvider } from './module/SchemaProvider'
import type { ModuleOptions } from './module/types/options'
import { ModuleHelper } from './module/ModuleHelper'
import { TEMPLATES } from './module/templates'
import { DevModeHandler } from './module/DevModeHandler'

export type { GraphqlMiddlewareServerOptions } from './types'
export type { ModuleOptions }

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
    await collector.init()

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
}

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
