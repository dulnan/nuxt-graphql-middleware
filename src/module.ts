import { fileURLToPath } from 'url'
import { defineNuxtModule } from '@nuxt/kit'
import { name, version } from '../package.json'
import { Template } from './runtime/settings'
import { defaultOptions } from './helpers'
import { Collector } from './module/Collector'
import type { HookResult } from 'nuxt/schema'
import type { OperationResponseError } from './runtime/types'
import { SchemaProvider } from './module/SchemaProvider'
import type { ModuleOptions } from './module/types/options'
import { ModuleHelper } from './module/ModuleHelper'
import GraphqlConfig from './module/templates/GraphqlConfig'
import DocumentTypes from './module/templates/DocumentTypes'
import Types from './module/templates/Types'
import HelpersTypes from './module/templates/HelpersTypes'
import Helpers from './module/templates/Helpers'
import ServerOptions from './module/templates/ServerOptions'
import ServerOptionsTypes from './module/templates/ServerOptionsTypes'
import ClientOptions from './module/templates/ClientOptions'
import ClientOptionsTypes from './module/templates/ClientOptionsTypes'
import { DevModeHandler } from './module/DevModeHandler'
export type { GraphqlMiddlewareServerOptions } from './types'

export interface ModuleHooks {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '>=3.16.0',
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
    await collector.init()

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

    nuxt.options.build.transpile.push(
      fileURLToPath(new URL('./runtime', import.meta.url)),
    )

    helper.inlineNitroExternals(helper.resolvers.module.resolve('./runtime'))
    helper.inlineNitroExternals(helper.paths.moduleBuildDir)

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

    // Static templates that only need to be built once, since they don't depend
    // on collected GraphQL documents.
    helper.addTemplate(Template.ClientOptions, ClientOptions)
    helper.addTemplate(Template.ClientOptionsTypes, ClientOptionsTypes)
    helper.addTemplate(Template.DocumentTypes, DocumentTypes)
    helper.addTemplate(Template.GraphqlConfig, GraphqlConfig)
    helper.addTemplate(Template.Helpers, Helpers)
    helper.addTemplate(Template.HelpersTypes, HelpersTypes)
    helper.addTemplate(Template.ServerOptions, ServerOptions)
    helper.addTemplate(Template.ServerOptionsTypes, ServerOptionsTypes)
    helper.addTemplate(Template.Types, Types)

    // Templates that depend on collected GraphQL documents.
    // Their contents are provided by the Collector and updated on watch event.
    collector.addTemplate(Template.Enums)
    collector.addTemplate(Template.NitroTypes)
    collector.addTemplate(Template.OperationSources)
    collector.addTemplate(Template.OperationTypes)
    collector.addTemplate(Template.OperationTypesAll)
    collector.addTemplate(Template.ResponseTypes)
    collector.addVirtualTemplate(Template.Documents)

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

export type { ModuleOptions }

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
