import { existsSync, promises as fsp } from 'node:fs'
import { resolveFiles, resolveAlias, useLogger } from '@nuxt/kit'
import { resolve } from 'pathe'
import type { Resolver } from '@nuxt/kit'
// @ts-ignore
import fragmentImport from '@graphql-fragment-import/lib/inline-imports.js'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import { loadSchema } from '@graphql-tools/load'
import Table from 'cli-table'
import chalk from 'chalk'
import type {
  GraphQLSchema,
  GraphQLError,
  DocumentNode,
  OperationDefinitionNode,
} from 'graphql'
import { parse, Source } from 'graphql'
import { falsy } from '../runtime/helpers'
import { CodegenResult, generateSchema, generateTemplates } from './../codegen'
import { GraphqlMiddlewareDocument } from './../types'
import { ModuleOptions } from './../module'

export const logger = useLogger('nuxt-graphql-middleware')

export const defaultOptions: ModuleOptions = {
  codegenConfig: {
    exportFragmentSpreadSubTypes: true,
    preResolveTypes: true,
    skipTypeNameForRoot: true,
    skipTypename: true,
    useTypeImports: true,
    onlyOperationTypes: true,
    namingConvention: {
      enumValues: 'change-case-all#upperCaseFirst',
    },
  },
  downloadSchema: true,
  schemaPath: './schema.graphql',
  serverApiPrefix: '/api/graphql_middleware',
  graphqlEndpoint: '',
  debug: false,
  includeComposables: true,
  documents: [],
  autoImportPatterns: ['**/*.{gql,graphql}', '!node_modules'],
}

/**
 * Import and inline fragments in GraphQL documents.
 */
export function inlineFragments(source: string, resolver: any): string {
  return fragmentImport(source, {
    resolveImport(identifier: string) {
      return resolver(identifier)
    },
    resolveOptions: {
      basedir: './',
    },
  })
}

function validateDeprecated(options: any) {
  const deprecatedKeys = [
    'graphqlEndpoint',
    'serverFetchOptions',
    'onServerResponse',
    'onServerError',
  ]

  deprecatedKeys.forEach((key) => {
    if (typeof options[key] === 'function') {
      logger.error(
        `Providing a function for "${key}" via nuxt.config.ts has been removed. Please move the configuration to ~/app/graphqlMiddleware.serverOptions.ts.`,
      )

      if (key === 'graphqlEndpoint') {
        logger.info(`
import { defineGraphqlServerOptions } from '#graphql-server-options'
import { getHeader } from 'h3'
import acceptLanguageParser from 'accept-language-parser';

export default defineGraphqlServerOptions({
  graphqlEndpoint(event, operation, operationName) {
    // Get accepted languages.
    const acceptLanguage = getHeader('accept-language')
    const languages = acceptLanguageParser.parse(acceptLanguage);

    // Use first match or fallback to English.
    const language = languages[0]?.code || 'en'
    return \`https://api.example.com/\${language}/graphql\`
  }
})`)
      }

      if (key === 'serverFetchOptions') {
        logger.info(`
import { defineGraphqlServerOptions } from '#graphql-server-options'
import { getHeader } from 'h3'

// Pass the cookie from the client request to the GraphQL request.
export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    return {
      headers: {
        Cookie: getHeader(event, 'cookie')
      }
    }
  }
})`)
      }

      if (key === 'onServerResponse') {
        logger.info(`
import { defineGraphqlServerOptions } from '#graphql-server-options'
import type { H3Event } from 'h3'
import type { FetchResponse } from 'ofetch'

export default defineGraphqlServerOptions({
  onServerResponse(event, graphqlResponse) {
    // Set a static header.
    event.node.res.setHeader('x-nuxt-custom-header', 'A custom header value')

    // Pass the set-cookie header from the GraphQL response to the client.
    const setCookie = graphqlResponse.headers.get('set-cookie')
    if (setCookie) {
      event.node.res.setHeader('set-cookie', setCookie)
    }

    // Add additional properties to the response.
    graphqlResponse._data.__customProperty = ['My', 'values']

    // Return the GraphQL response.
    return graphqlResponse._data
  }
})`)
      }

      if (key === 'onServerError') {
        logger.info(`
import { defineGraphqlServerOptions } from '#graphql-server-options'
import type { H3Event } from 'h3'
import type { FetchError } from 'ofetch'

export default defineGraphqlServerOptions({
  onServerError( event, error, operation, operationName) {
    event.setHeader('cache-control', 'no-cache')
    return {
      data: {},
      errors: [error.message]
    }
  }
})`)
      }

      throw new TypeError('Invalid configuration for graphqlMiddleware.' + key)
    }
  })
}

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }

  validateDeprecated(options)
}

/**
 * Get the path to the GraphQL schema.
 */
export async function getSchemaPath(
  options: ModuleOptions,
  resolver: Resolver['resolve'],
  writeToDisk = false,
): Promise<string> {
  const dest = resolver(options.schemaPath!)
  if (!options.downloadSchema) {
    const fileExists = await fsp
      .access(dest)
      .then(() => true)
      .catch(() => false)
    if (!fileExists) {
      logger.error(
        '"downloadSchema" is set to false but no schema exists at ' + dest,
      )
      throw new Error('Missing GraphQL schema.')
    }
    return dest
  }
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint config.')
  }
  await generateSchema(options, dest, writeToDisk)
  return dest
}

/**
 * Read the GraphQL files for the given patterns.
 */
export async function autoImportDocuments(
  patterns: string[] = [],
  srcResolver: Resolver['resolve'],
): Promise<GraphqlMiddlewareDocument[]> {
  if (!patterns.length) {
    return Promise.resolve([])
  }
  const files = (
    await resolveFiles(srcResolver(), patterns, {
      followSymbolicLinks: false,
    })
  ).filter((path) => {
    return !path.includes('schema.gql') && !path.includes('schema.graphql')
  })

  return Promise.all(
    files.map((filename) => {
      return fsp.readFile(filename).then((v) => {
        const content = v.toString().trim()
        return {
          content,
          filename,
        }
      })
    }),
  )
}

export function buildDocuments(
  providedDocuments: string[] = [],
  autoImportPatterns: string[],
  resolver: Resolver['resolve'],
): Promise<GraphqlMiddlewareDocument[]> {
  return autoImportDocuments(autoImportPatterns, resolver)
    .then((importedDocuments) => {
      return [
        ...importedDocuments,
        ...providedDocuments.map((content) => {
          return {
            content,
            filename: 'nuxt.config.ts',
          }
        }),
      ].filter((v) => v.content)
    })
    .then((documents) => {
      return documents
        .map((v) => {
          try {
            return {
              content: inlineFragments(v.content, resolveAlias),
              filename: v.filename,
            }
          } catch (e) {
            logger.error(
              'Failed to inline fragments for document: ' + v.filename,
            )
          }
          return null
        })
        .filter(falsy)
    })
}

export function parseDocument(
  document: GraphqlMiddlewareDocument,
  srcDir: string,
): DocumentNode {
  let name = document.filename ? document.filename.replace(srcDir, '') : ''
  if (name.charAt(0) === '/') {
    name = name.slice(1)
  }
  const source = new Source(document.content, name)
  return parse(source)
}

export function validateDocuments(
  schema: GraphQLSchema,
  documents: GraphqlMiddlewareDocument[],
  srcDir: string,
): GraphqlMiddlewareDocument[] {
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i]
    try {
      const node = parseDocument(document, srcDir)
      document.errors = validateGraphQlDocuments(schema, [
        node,
      ]) as GraphQLError[]

      const operation = node.definitions.find(
        (v) => v.kind === 'OperationDefinition',
      ) as OperationDefinitionNode | undefined
      if (operation) {
        document.name = operation.name?.value
        document.operation = operation.operation
      }

      // document.name = node
      document.isValid = document.errors.length === 0
    } catch (e) {
      document.errors = [e as GraphQLError]
      document.isValid = false
    }
  }

  return documents
}

/**
 * Generates the TypeScript definitions and documents files.
 */
export async function generate(
  options: ModuleOptions,
  schemaPath: string,
  resolver: Resolver['resolve'],
  srcDir: string,
  logEverything = false,
) {
  const schemaContent = await fsp.readFile(schemaPath).then((v) => v.toString())
  const schema = await loadSchema(schemaContent, { loaders: [] })

  const documents = await buildDocuments(
    options.documents,
    options.autoImportPatterns as string[],
    resolver,
  )

  const validated = validateDocuments(schema, documents, srcDir)

  const templates = await generateTemplates(
    validated.filter((v) => v.isValid).map((v) => v.content),
    schemaPath,
    options,
  )

  const hasErrors = validated.some((v) => !v.isValid)
  if (hasErrors || logEverything) {
    const table = new Table({
      head: ['Operation', 'Name', 'File', 'Errors'].map((v) => chalk.white(v)),
    })

    validated.forEach((document) => {
      if (logEverything || !document.isValid) {
        table.push(
          [
            document.operation || '',
            document.name || '',
            document.filename?.replace(srcDir, '') || '',
            document.errors?.join('\n\n') || '',
          ].map((v) => {
            if (document.isValid) {
              return v
            }
            return chalk.red(v)
          }),
        )
      }
    })

    logger.log(table.toString())
  }

  logger.info('Finished GraphQL code generation.')

  return {
    templates: templates.sort((a, b) => {
      return a.filename.localeCompare(b.filename)
    }),
    hasErrors,
    documents: validated.sort((a, b) => {
      if (a.filename && b.filename) {
        return a.filename.localeCompare(b.filename)
      }
      return -1
    }),
  }
}

export const fileExists = (
  path?: string,
  extensions = ['js', 'ts'],
): string | null => {
  if (!path) {
    return null
  } else if (existsSync(path)) {
    // If path already contains/forces the extension
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
  await fsp.mkdir(outputPath, { recursive: true })
  documents.forEach((v) => {
    if (v.operation && v.name) {
      const fileName = [v.operation, v.name, 'graphql'].join('.')
      const filePath = resolve(outputPath, fileName)
      fsp.writeFile(filePath, v.content)
    }
  })
}
