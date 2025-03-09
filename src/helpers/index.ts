import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { useLogger } from '@nuxt/kit'
import { resolve } from 'pathe'
import type { ConsolaInstance } from 'consola'
import type { Resolver } from '@nuxt/kit'
import { generateSchema } from './../codegen'
import { type GraphqlMiddlewareDocument } from './../types'
import { type ModuleOptions } from './../module'
import { name } from '../../package.json'

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
}

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }
}

/**
 * Get the path to the GraphQL schema.
 */
export async function getSchemaPath(
  schemaPath: string,
  options: ModuleOptions,
  resolver: Resolver['resolve'],
  writeToDisk = false,
): Promise<{ schemaPath: string; schemaContent: string }> {
  const dest = resolver(schemaPath)
  if (!options.downloadSchema) {
    const fileExists = await fs
      .access(dest)
      .then(() => true)
      .catch(() => false)
    if (!fileExists) {
      logger.error(
        '"downloadSchema" is set to false but no schema exists at ' + dest,
      )
      throw new Error('Missing GraphQL schema.')
    }
    const schemaContent = await fs.readFile(dest).then((v) => v.toString())
    return { schemaPath, schemaContent }
  }
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint config.')
  }
  const result = await generateSchema(options, dest, writeToDisk)
  return { schemaPath, schemaContent: result.content }
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
