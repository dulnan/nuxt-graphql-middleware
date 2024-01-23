import { existsSync, promises as fsp } from 'node:fs'
import { oldVisit } from '@graphql-codegen/plugin-helpers'
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
  FragmentDefinitionNode,
} from 'graphql'
import { parse, Source, print, visit, Kind } from 'graphql'
import { falsy } from '../runtime/helpers'
import { generateSchema, generateTemplates } from './../codegen'
import { type GraphqlMiddlewareDocument } from './../types'
import { type ModuleOptions } from './../module'

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
  autoImportPatterns: [],
  devtools: true,
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
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
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
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
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
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
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
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
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
            logger.error(e)
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
  const validated: GraphqlMiddlewareDocument[] = []

  for (let i = 0; i < documents.length; i++) {
    const document = { ...documents[i] }
    if (document.filename) {
      document.relativePath = document.filename.replace(srcDir + '/', '')
    }
    try {
      const node = parseDocument(document, srcDir)
      document.content = print(node)
      document.errors = validateGraphQlDocuments(schema, [
        node,
      ]) as GraphQLError[]

      const operation = node.definitions.find(
        (v) => v.kind === 'OperationDefinition',
      ) as OperationDefinitionNode | undefined
      if (operation) {
        document.name = operation.name?.value
        document.operation = operation.operation
      } else {
        const fragment = node.definitions.find(
          (v) => v.kind === 'FragmentDefinition',
        ) as FragmentDefinitionNode
        document.name = document.relativePath
      }

      // document.name = node
      document.isValid = document.errors.length === 0
    } catch (e) {
      document.errors = [e as GraphQLError]
      document.isValid = false
    }

    document.id = [document.operation, document.name, document.filename]
      .filter(Boolean)
      .join('_')

    validated.push(document)

    // Exit from loop when an error was detected, because it might be a
    // fragment which is used in multiple documents and would show all of
    // them as invalid.
    if (!document.isValid) {
      break
    }
  }

  return validated
}

/**
 * Parses the given document body, removes all operations except the one given
 * as the second argument and removes all fragments not used by the operation.
 */
function cleanGraphqlDocument(
  graphqlContent: string,
  operationName: string,
): DocumentNode {
  const document = parse(graphqlContent)

  let selectedOperation: OperationDefinitionNode | null = null
  const fragments: { [key: string]: FragmentDefinitionNode } = {}
  const usedFragments: Set<string> = new Set()

  // Find the desired operation and gather all fragment definitions
  visit(document, {
    OperationDefinition(node) {
      if (node.name?.value === operationName) {
        selectedOperation = node
      }
    },
    FragmentDefinition(node) {
      fragments[node.name.value] = node
    },
  })

  if (!selectedOperation) {
    throw new Error(`Operation named "${operationName}" not found`)
  }

  // Find fragments used by the selected operation
  visit(selectedOperation, {
    FragmentSpread(node) {
      usedFragments.add(node.name.value)
    },
  })

  // If a fragment uses another fragment, we need to add it to the usedFragments set
  let hasNewFragments = true
  while (hasNewFragments) {
    hasNewFragments = false
    for (const fragmentName of usedFragments) {
      visit(fragments[fragmentName], {
        FragmentSpread(node) {
          if (!usedFragments.has(node.name.value)) {
            usedFragments.add(node.name.value)
            hasNewFragments = true
          }
        },
      })
    }
  }

  // Construct the cleaned GraphQL document
  return {
    kind: Kind.DOCUMENT,
    definitions: [
      selectedOperation,
      ...Array.from(usedFragments).map(
        (fragmentName) => fragments[fragmentName],
      ),
    ],
  }
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

  const extracted: GraphqlMiddlewareDocument[] = validated.filter(
    (v) => !v.operation,
  )

  for (let i = 0; i < validated.length; i++) {
    const v = validated[i]
    if (v.isValid) {
      try {
        const node = parse(v.content)
        oldVisit(node, {
          enter: {
            OperationDefinition: (node: OperationDefinitionNode) => {
              if (
                node.name?.value &&
                node.loc?.source &&
                (node.operation === 'query' || node.operation === 'mutation')
              ) {
                const document = { ...v }
                const cleaned = cleanGraphqlDocument(
                  node.loc.source.body,
                  node.name.value,
                )
                const errors = validateGraphQlDocuments(schema, [cleaned])
                document.errors = document.errors || []
                document.errors.push(...errors)
                document.isValid = !document.errors.length
                document.name = node.name.value
                document.operation = node.operation
                document.content = print(cleaned)
                document.id = [
                  document.operation,
                  document.name,
                  document.filename,
                ]
                  .filter(Boolean)
                  .join('_')
                extracted.push(document)
              }
            },
          },
        })
      } catch (e) {
        // Parsing errors should have been caught already. Log error.
        logger.error(e)
        extracted.push(v)
        break
      }
    } else {
      // Push the first invalid document to the array and then break from the loop.
      // That way we can make sure that only the first occurence of an error
      // (e.g. in a fragment) is logged, instead of potentially logging the
      // error dozends of times.
      extracted.push(v)
      break
    }
  }

  const templates = await generateTemplates(
    extracted.filter((v) => v.isValid).map((v) => v.content),
    schemaPath,
    options,
  )

  const hasErrors =
    extracted.some((v) => !v.isValid) || validated.some((v) => !v.isValid)
  if (hasErrors || logEverything) {
    const table = new Table({
      head: ['Operation', 'Name', 'File', 'Errors'].map((v) => chalk.white(v)),
    })

    extracted.forEach((document) => {
      if (logEverything || !document.isValid) {
        table.push(
          [
            document.operation || '',
            document.name || '',
            document.relativePath || '',
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

    logger.log('GraphQL code generation table:\n' + table.toString())
  }

  process.stdout.write('\n')
  logger.restoreStd()

  hasErrors
    ? logger.error('GraphQL code generation failed with errors.')
    : logger.success('Finished GraphQL code generation.')

  return {
    templates: templates.sort((a, b) => {
      return a.filename.localeCompare(b.filename)
    }),
    hasErrors,
    documents: extracted.sort((a, b) => {
      const nameA = a.name || ''
      const nameB = b.name || ''
      return nameA.localeCompare(nameB)
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
