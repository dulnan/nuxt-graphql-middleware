import { promises as fs } from 'node:fs'
import { basename } from 'node:path'
import { relative } from 'pathe'
import {
  parse,
  type DocumentNode,
  type GraphQLSchema,
  type GraphQLError,
  Source,
  printSourceLocation,
} from 'graphql'
import { resolveFiles } from '@nuxt/kit'
import {
  Generator,
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

type MaxLengths = {
  name: number
  path: number
  type: number
}

type LogEntry = {
  name: string
  type: string
  path: string
  errors: readonly GraphQLError[]
}

function getMaxLengths(entries: LogEntry[]): MaxLengths {
  let name = 0
  let path = 0
  let type = 0

  for (const entry of entries) {
    if (entry.type.length > type) {
      type = entry.type.length
    }
    if (entry.name.length > name) {
      name = entry.name.length
    }
    if (entry.path.length > path) {
      path = entry.path.length
    }
  }
  return { name, path, type }
}

function logAllEntries(entries: LogEntry[]) {
  const lengths = getMaxLengths(entries)
  let prevHadError = false
  for (const entry of entries) {
    const hasErrors = entry.errors.length > 0
    const icon = hasErrors ? colors.red('x') : colors.green('✔')
    const type = entry.type.padEnd(lengths.type)
    const namePadded = colors.bold(entry.name.padEnd(lengths.name))
    const name = hasErrors ? colors.red(namePadded) : colors.green(namePadded)
    const path = colors.dim(entry.path)
    const parts: string[] = [icon, type, name, path]
    if (hasErrors && !prevHadError) {
      process.stdout.write('-'.repeat(process.stdout.columns) + '\n')
    }
    logger.log(parts.join(' | '))
    if (hasErrors) {
      const errorLines: string[] = []
      entry.errors.forEach((error) => {
        let output = colors.red(error.message)
        if (error.source && error.locations) {
          for (const location of error.locations) {
            output +=
              '\n\n' + colors.red(printSourceLocation(error.source, location))
          }
        }
        errorLines.push(output)
      })

      logger.log(
        errorLines
          .join('\n')
          .split('\n')
          .map((v) => '    ' + v)
          .join('\n'),
      )
      process.stdout.write('-'.repeat(process.stdout.columns) + '\n')
    }

    prevHadError = hasErrors
  }

  logger.restoreStd()
}

/**
 * A single .graphql file in memory (parse-only for syntax).
 */
export class CollectedFile {
  filePath: string
  fileContents: string
  isOnDisk: boolean
  parsed: DocumentNode

  constructor(filePath: string, fileContents: string, isOnDisk = false) {
    this.filePath = filePath
    this.fileContents = fileContents
    this.isOnDisk = isOnDisk
    this.parsed = parse(fileContents)
  }

  static async fromFilePath(filePath: string): Promise<CollectedFile> {
    const content = (await fs.readFile(filePath)).toString()
    return new CollectedFile(filePath, content, true)
  }

  /**
   * If isOnDisk, re-read file contents from disk, then parse it (syntax only).
   */
  async update(): Promise<boolean> {
    if (this.isOnDisk) {
      const newContents = (await fs.readFile(this.filePath)).toString()

      // If contents are identical, return.
      if (newContents === this.fileContents) {
        return false
      }

      this.fileContents = newContents
      this.parsed = parse(newContents)
      return true
    }

    // Files not on disk never need update.
    return false
  }
}

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

  /**
   * Whether we need to rebuild the Generator state.
   */
  private needsRebuild = false

  constructor(
    private schema: GraphQLSchema,
    private context: ModuleContext,
    private nuxtConfigDocuments: string[] = [],
    generatorOptions?: GeneratorOptions,
  ) {
    this.generator = new Generator(schema, generatorOptions)
  }

  private filePathToRelative(filePath: string): string {
    return './' + relative(this.context.buildDir, filePath)
  }

  private operationToLogEntry(
    operation: GeneratorOutputOperation,
    errors: readonly GraphQLError[],
  ): LogEntry {
    return {
      name: operation.graphqlName,
      type: operation.operationType,
      path: operation.filePath,
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

      logEntries.push(this.operationToLogEntry(operation, errors))
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
    // Get all files that match the import patterns.
    const files = await this.getImportPatternFiles()

    for (const filePath of files) {
      await this.addFile(filePath)
    }

    // Add files from nuxt.config.ts.
    this.nuxtConfigDocuments.forEach((docString, i) => {
      const pseudoPath = `nuxt.config.ts[${i}]`
      const file = new CollectedFile(pseudoPath, docString, false)
      this.files.set(pseudoPath, file)
      this.generator.add({
        filePath: this.filePathToRelative('nuxt.config.ts'),
        documentNode: file.parsed,
      })
    })

    this.buildState()
    logger.success('All GraphQL documents are valid.')
  }

  /**
   * Add a file.
   */
  private async addFile(filePath: string): Promise<CollectedFile> {
    const file = await CollectedFile.fromFilePath(filePath)
    this.files.set(filePath, file)
    this.generator.add({
      filePath: this.filePathToRelative(filePath),
      documentNode: file.parsed,
    })
    return file
  }

  private async handleAdd(filePath: string): Promise<boolean> {
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
      filePath: this.filePathToRelative(filePath),
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
    this.generator.remove(this.filePathToRelative(filePath))
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
  ): Promise<boolean> {
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
      logger.error(e)
      return false
    }

    if (hasChanged) {
      logger.success('Finished GraphQL code update.')
    }

    return hasChanged
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
