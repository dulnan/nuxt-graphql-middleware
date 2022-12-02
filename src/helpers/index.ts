import { promises as fsp } from 'fs'
import { resolveFiles, resolveAlias, useLogger } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
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
import { generateSchema, generateTemplates } from './../codegen'
import { GraphqlMiddlewareConfig, GraphqlMiddlewareDocument } from './../types'

export const logger = useLogger('nuxt-graphql-middleware')

export const defaultOptions: GraphqlMiddlewareConfig = {
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

/**
 * Validate the module options.
 */
export function validateOptions(options: Partial<GraphqlMiddlewareConfig>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }
}

/**
 * Get the path to the GraphQL schema.
 */
export async function getSchemaPath(
  options: GraphqlMiddlewareConfig,
  resolver: Resolver['resolve'],
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
  const graphqlEndpoint =
    typeof options.graphqlEndpoint === 'string'
      ? options.graphqlEndpoint
      : options.graphqlEndpoint()
  await generateSchema(graphqlEndpoint, dest, true)
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
      document.errors =
        e && typeof e === 'object' && e !== null
          ? [e.message]
          : ['Validation failed']
      document.isValid = false
    }
  }

  return documents
}

/**
 * Generates the TypeScript definitions and documents files.
 */
export async function generate(
  options: GraphqlMiddlewareConfig,
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

  return { templates, hasErrors }
}
