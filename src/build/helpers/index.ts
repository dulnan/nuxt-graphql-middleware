import { existsSync } from 'node:fs'
import { useLogger } from '@nuxt/kit'
import type { ConsolaInstance } from 'consola'
import type { ModuleOptions } from '../types/options'

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
  },
  clientCache: {
    enabled: false,
    maxSize: 100,
  },
  mcp: {
    enabled: false,
  },
}

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
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
