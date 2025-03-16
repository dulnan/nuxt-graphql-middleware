import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { useLogger } from '@nuxt/kit'
import { resolve } from 'pathe'
import type { ConsolaInstance } from 'consola'
import type { Resolver } from '@nuxt/kit'
import { type GraphqlMiddlewareDocument } from './../types'
import { name } from '../../package.json'
import type { ModuleOptions } from '../module/types/options'
import type { Nuxt } from '@nuxt/schema'

export const logger: ConsolaInstance = useLogger(name)

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

export async function outputDocuments(
  outputPath: string,
  documents: GraphqlMiddlewareDocument[],
) {
  await fs.mkdir(outputPath, { recursive: true })
  documents.forEach((v) => {
    if (v.operation && v.name) {
      const fileName = [v.operation, v.name, 'graphql'].join('.')
      const filePath = resolve(outputPath, fileName)
      fs.writeFile(filePath, v.content)
    }
  })
}

export async function getOutputDocumentsPath(
  optionsOutputDocuments: ModuleOptions['outputDocuments'],
  nuxtBuildDir: string,
  resolvePath: Resolver['resolvePath'],
): Promise<string | null> {
  if (!optionsOutputDocuments) {
    return null
  }

  if (typeof optionsOutputDocuments === 'boolean') {
    return resolve(nuxtBuildDir, `${name}/documents`)
  } else {
    return await resolvePath(optionsOutputDocuments)
  }
}

/**
 * Not exactly sure what this is doing, but it's needed for certain templates
 * to work correctly.
 */
export function inlineNitroExternals(nuxt: Nuxt, path: string) {
  nuxt.options.nitro.externals = nuxt.options.nitro.externals || {}
  nuxt.options.nitro.externals.inline =
    nuxt.options.nitro.externals.inline || []
  nuxt.options.nitro.externals.inline.push(path)
}
