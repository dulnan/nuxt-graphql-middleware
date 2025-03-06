import { basename } from 'node:path'
import { relative } from 'pathe'
import { parse, type GraphQLSchema, type GraphQLError, Source } from 'graphql'
import { resolveFiles } from '@nuxt/kit'
import {
  FieldNotFoundError,
  FragmentNotFoundError,
  Generator,
  TypeNotFoundError,
  type GeneratorOptions,
  type GeneratorOutputOperation,
} from 'graphql-typescript-deluxe'
import { generateContextTemplate } from './templates/context'
import type { ModuleContext } from './types'
import type { WatchEvent } from 'nuxt/schema'
import colors from 'picocolors'
import { logger } from '../helpers'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import type { RpcItem } from '../rpc-types'
import { logAllEntries, SYMBOL_CROSS, type LogEntry } from './logging'
import { CollectedFile } from './CollectedFile'

export class Collector {
  /**
   * All collected files.
   */
  private files = new Map<string, CollectedFile>()

  /**
   * The code generator.
   */
  private generator: Generator

  /**
   * A map of operation name and timestamp when the operation was last validated.
   */
  private operationTimestamps: Map<string, number> = new Map()

  /**
   * The generated operations and fragments.
   */
  public readonly rpcItems: Map<string, RpcItem> = new Map()

  /**
   * The generated TypeScript type template output.
   */
  private outputTypes = ''

  /**
   * The generated oeprations file.
   */
  private outputOperations = ''

  /**
   * The generated context template file.
   */
  private outputContext = ''

  constructor(
    private schema: GraphQLSchema,
    private context: ModuleContext,
    private nuxtConfigDocuments: string[] = [],
    generatorOptions: GeneratorOptions = {},
  ) {
    const mappedOptions = { ...generatorOptions }
    if (!mappedOptions.output) {
      mappedOptions.output = {}
    }

    if (!mappedOptions.output.buildTypeDocFilePath) {
      mappedOptions.output.buildTypeDocFilePath = (filePath: string) => {
        return this.filePathToBuildRelative(filePath)
      }
    }

    this.generator = new Generator(schema, mappedOptions)
  }

  private filePathToBuildRelative(filePath: string): string {
    return './' + relative(this.context.buildDir, filePath)
  }

  private filePathToSourceRelative(filePath: string): string {
    return './' + relative(process.cwd(), filePath)
  }

  private operationToLogEntry(
    operation: GeneratorOutputOperation,
    errors: readonly GraphQLError[],
  ): LogEntry {
    return {
      name: operation.graphqlName,
      type: operation.operationType,
      path: this.filePathToSourceRelative(operation.filePath),
      errors,
    }
  }

  /**
   * Executes code gen and performs validation for operations.
   */
  private buildState() {
    const output = this.generator.build()
    const operations = output.getCollectedOperations()
    const generatedCode = output.getGeneratedCode()

    this.outputOperations = output.getOperationsFile()
    this.outputTypes = output.getEverything()
    this.outputContext = generateContextTemplate(
      operations,
      this.context.serverApiPrefix,
    )

    // A map of GraphQL fragment name => fragment source.
    const fragmentMap: Map<string, string> = new Map()

    // A map of GraphQL operation name => operation source.
    const operationSourceMap: Map<string, string> = new Map()

    for (const code of generatedCode) {
      if (code.type === 'fragment' && code.graphqlName && code.source) {
        fragmentMap.set(code.graphqlName, code.source)
      } else if (code.type === 'operation' && code.graphqlName && code.source) {
        operationSourceMap.set(code.graphqlName, code.source)
      }
    }

    let hasErrors = false
    const logEntries: LogEntry[] = []
    for (const operation of operations) {
      const previousTimestamp = this.operationTimestamps.get(
        operation.graphqlName,
      )

      // If timestamps are identical we can skip validation.
      if (previousTimestamp === operation.timestamp) {
        continue
      }

      // Merge all fragments the operation needs.
      const fragments = operation
        .getGraphQLFragmentDependencies()
        .map((v) => fragmentMap.get(v) || '')
        .join('\n')

      const fullOperation =
        operationSourceMap.get(operation.graphqlName) + fragments
      const source = new Source(fullOperation, basename(operation.filePath))
      const document = parse(source)
      const errors = validateGraphQlDocuments(this.schema, [document])

      if (errors.length) {
        hasErrors = true
      } else {
        // If valid, update the timestamp.
        this.operationTimestamps.set(operation.graphqlName, operation.timestamp)
      }

      const shouldLog = errors.length || !this.context.logOnlyErrors

      if (shouldLog) {
        logEntries.push(this.operationToLogEntry(operation, errors))
      }
    }

    logAllEntries(logEntries)

    if (hasErrors) {
      throw new Error('GraphQL errors')
    }

    for (const code of generatedCode) {
      const id = `${code.identifier}_${code.graphqlName}`
      if (
        code.identifier === 'fragment' ||
        code.identifier === 'mutation' ||
        code.identifier === 'query'
      ) {
        if (this.rpcItems.get(id)?.timestamp === code.timestamp) {
          continue
        }

        const fragmentDepdendencies = code
          .getGraphQLFragmentDependencies()
          .map((name) => fragmentMap.get(name) || '')
          .join('\n\n')
        this.rpcItems.set(id, {
          id,
          timestamp: code.timestamp,
          source: code.source! + '\n\n' + fragmentDepdendencies,
          name: code.graphqlName!,
          filePath: code.filePath!,
          identifier: code.identifier,
        })
      }
    }
  }

  private buildErrorMessage(error: unknown) {
    let output = ''
    if (
      error instanceof FieldNotFoundError ||
      error instanceof TypeNotFoundError ||
      error instanceof FragmentNotFoundError
    ) {
      const filePath = error.context?.filePath
      const file = filePath ? this.files.get(filePath) : null

      if (filePath) {
        output += ` | ${this.filePathToSourceRelative(filePath)}\n`
      }

      output += '\n' + error.message + '\n\n'

      if (file) {
        output += file.fileContents
      }
    } else if (error instanceof Error) {
      output += '\n' + error.message
    }

    return output
  }

  private logError(error: unknown) {
    let output = `${SYMBOL_CROSS}`
    output += this.buildErrorMessage(error)

    logger.error(colors.red(output))
  }

  /**
   * Get all file paths that match the import patterns.
   */
  private async getImportPatternFiles(): Promise<string[]> {
    if (this.context.patterns.length) {
      return resolveFiles(this.context.srcDir, this.context.patterns, {
        followSymbolicLinks: false,
      })
    }
    return []
  }

  /**
   * Initialise the collector.
   */
  public async init() {
    try {
      // Get all files that match the import patterns.
      const files = await this.getImportPatternFiles()

      for (const filePath of files) {
        await this.addFile(filePath)
      }

      const nuxtConfigDocuments = this.nuxtConfigDocuments.join('\n\n')

      if (nuxtConfigDocuments.length) {
        const filePath = this.context.nuxtConfigPath
        const file = new CollectedFile(filePath, nuxtConfigDocuments, false)
        this.files.set(filePath, file)
        this.generator.add({
          filePath,
          documentNode: file.parsed,
        })
      }

      this.buildState()
      logger.success('All GraphQL documents are valid.')
    } catch (e) {
      this.logError(e)

      throw new Error('GraphQL document validation failed.')
    }
  }

  /**
   * Add a file.
   */
  private async addFile(filePath: string): Promise<CollectedFile> {
    const file = await CollectedFile.fromFilePath(filePath)
    this.files.set(filePath, file)
    this.generator.add({
      filePath,
      documentNode: file.parsed,
    })
    return file
  }

  private async handleAdd(filePath: string): Promise<boolean> {
    const matching = await this.getImportPatternFiles()
    if (!matching.includes(filePath)) {
      return false
    }
    await this.addFile(filePath)
    return true
  }

  private async handleChange(filePath: string): Promise<boolean> {
    const file = this.files.get(filePath)
    if (!file) {
      return false
    }

    const needsUpdate = await file.update()
    if (!needsUpdate) {
      return false
    }
    this.generator.update({
      filePath: filePath,
      documentNode: file.parsed,
    })
    return true
  }

  private handleUnlink(filePath: string): boolean {
    const file = this.files.get(filePath)
    if (!file) {
      return false
    }
    this.files.delete(filePath)
    this.generator.remove(filePath)
    return true
  }

  private handleUnlinkDir(folderPath: string): boolean {
    let anyHasChanged = false
    for (const filePath of [...this.files.keys()]) {
      if (filePath.startsWith(folderPath)) {
        const hasChanged = this.handleUnlink(filePath)
        if (hasChanged) {
          anyHasChanged = true
        }
      }
    }

    return anyHasChanged
  }

  /**
   * Handle the watcher event for the given file path.
   */
  public async handleWatchEvent(
    event: WatchEvent,
    filePath: string,
  ): Promise<{ hasChanged: boolean; error?: { message: string } }> {
    let hasChanged = false
    try {
      if (event === 'add') {
        hasChanged = await this.handleAdd(filePath)
      } else if (event === 'change') {
        hasChanged = await this.handleChange(filePath)
      } else if (event === 'unlink') {
        hasChanged = this.handleUnlink(filePath)
      } else if (event === 'unlinkDir') {
        hasChanged = this.handleUnlinkDir(filePath)
      } else if (event === 'addDir') {
        // @TODO: Should this be handled?
      }

      if (hasChanged) {
        this.buildState()
      }
    } catch (e) {
      this.generator.resetCaches()
      logger.error('Failed to update GraphQL code.')
      this.logError(e)
      return {
        hasChanged: false,
        error: { message: this.buildErrorMessage(e) },
      }
    }

    if (hasChanged) {
      logger.success('Finished GraphQL code update successfully.')
    }

    return { hasChanged }
  }

  /**
   * Get the TypeScript types template contents.
   */
  public getTemplateTypes(): string {
    return this.outputTypes
  }

  /**
   * Get the context template contents.
   */
  public getTemplateContext(): string {
    return this.outputContext
  }

  /**
   * Get the operations template contents.
   */
  public getTemplateOperations(): string {
    return this.outputOperations
  }
}
