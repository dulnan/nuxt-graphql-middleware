import { existsSync } from 'node:fs'
import { useLogger } from '@nuxt/kit'
import type { ConsolaInstance } from 'consola'
import type { ModuleOptions } from '../types/options'
import type { Nuxt } from 'nuxt/schema'

export const logger: ConsolaInstance = useLogger('nuxt-graphql-middleware')

export const defaultOptions: ModuleOptions = {
  downloadSchema: true,
  schemaPath: '~~/schema.graphql',
  serverApiPrefix: '/api/graphql_middleware',
  graphqlEndpoint: '',
  debug: false,
  includeComposables: true,
  documents: [],
  devtools: true,
  errorOverlay: true,
  graphqlConfigFilePath: './graphql.config.ts',
  experimental: {
    improvedQueryParamEncoding: false,
    subscriptions: false,
  },
  clientCache: {
    enabled: false,
    maxSize: 100,
  },
}

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<ModuleOptions>, nuxt: Nuxt) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }

  if (options.experimental?.subscriptions) {
    const websocketEnabled = nuxt.options.nitro.experimental?.websocket
    if (!websocketEnabled) {
      logger.error(
        'Support for subscriptions requires enabling the experimental "websocket" feature in Nitro. https://nitro.build/guide/websocket#opt-in-to-the-experimental-feature',
      )
      throw new Error('Nitro websocket support not enabled.')
    }
  }
}

export const fileExists = (
  path?: string,
  extensions = ['js', 'ts', 'mjs'],
): string | null => {
  if (!path) {
    return null
  } else if (existsSync(path)) {
    return path
  }

  const extension = extensions.find((extension) =>
    existsSync(`${path}.${extension}`),
  )

  return extension ? `${path}.${extension}` : null
}
