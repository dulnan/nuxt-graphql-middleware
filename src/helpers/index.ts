import { existsSync, promises as fsp } from 'node:fs'
import { oldVisit } from '@graphql-codegen/plugin-helpers'
import { resolveFiles, resolveAlias, useLogger } from '@nuxt/kit'
import { resolve } from 'pathe'
import type { Resolver } from '@nuxt/kit'
import { inlineImportsWithLineToImports } from './fragment-import'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import { loadSchema } from '@graphql-tools/load'
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
import { logDocuments } from './reporter'

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
  schemaPath: '~~/schema.graphql',
  serverApiPrefix: '/api/graphql_middleware',
  graphqlEndpoint: '',
  debug: false,
  includeComposables: true,
  documents: [],
  devtools: true,
}

/**
 * Import and inline fragments in GraphQL documents.
 */
export function inlineFragments(source: string, resolver: any): string {
  return inlineImportsWithLineToImports(source, {
    resolveImport(identifier: string) {
      return resolver(identifier)
    },
    resolveOptions: {
      basedir: './',
    },
  }).inlineImports
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
  options: Pick<
    ModuleOptions,
    'schemaPath' | 'downloadSchema' | 'graphqlEndpoint'
  >,
  resolver: Resolver['resolve'],
  writeToDisk = false,
): Promise<string> {
  const dest = resolver(options.schemaPath!)
  console.log({ dest })
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

function inlineNestedFragments(
  document: string,
  fragmentMap: Record<string, string>,
): string {
  const parsed = parse(document)
  const fragmentsToInline: Set<string> = new Set()

  // Collect all fragment spreads in the document
  visit(parsed, {
    FragmentSpread(node) {
      fragmentsToInline.add(node.name.value)
    },
  })

  // Inline fragments recursively
  fragmentsToInline.forEach((fragmentName) => {
    const fragment = fragmentMap[fragmentName]
    if (fragment) {
      document += '\n' + fragment
      const nestedFragmentNames = new Set<string>()
      visit(parse(fragment), {
        FragmentSpread(node) {
          nestedFragmentNames.add(node.name.value)
        },
      })
      nestedFragmentNames.forEach((nestedFragmentName) => {
        if (!fragmentsToInline.has(nestedFragmentName)) {
          fragmentsToInline.add(nestedFragmentName)
          const nestedFragment = fragmentMap[nestedFragmentName]
          if (nestedFragment) {
            document += '\n' + nestedFragment
          }
        }
      })
    }
  })

  return document
}

export async function buildDocuments(
  providedDocuments: string[] = [],
  autoImportPatterns: string[],
  resolver: Resolver['resolve'],
  autoInlineFragments: boolean,
): Promise<GraphqlMiddlewareDocument[]> {
  const documents = await autoImportDocuments(autoImportPatterns, resolver)
    .then((importedDocuments) => [
      ...importedDocuments,
      ...providedDocuments.map((content) => ({
        content,
        filename: 'nuxt.config.ts',
      })),
    ])
    .then((documents) => {
      // If auto inlining is enabled, we can skip.
      if (autoInlineFragments) {
        return documents
      }
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

  if (!autoInlineFragments) {
    return documents
  }

  const fragmentMap: Record<string, string> = {}
  documents.forEach((doc) => {
    const parsed = parse(doc.content)
    visit(parsed, {
      FragmentDefinition(node) {
        fragmentMap[node.name.value] = print(node)
      },
    })
  })

  documents.forEach((doc) => {
    doc.content = inlineNestedFragments(doc.content, fragmentMap)
  })

  return documents
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
        document.name = document.relativePath
      }

      document.isValid = document.errors.length === 0
    } catch (e) {
      document.errors = [e as GraphQLError]
      document.isValid = false
    }

    document.id = [document.operation, document.name, document.filename]
      .filter(Boolean)
      .join('_')

    validated.push(document)

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

  visit(selectedOperation, {
    FragmentSpread(node) {
      usedFragments.add(node.name.value)
    },
  })

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
    !!options.autoInlineFragments,
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
        logger.error(e)
        extracted.push(v)
        break
      }
    } else {
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
    logDocuments(logger, extracted, logEverything)
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
