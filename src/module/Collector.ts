import { basename } from 'node:path'
import { relative } from 'pathe'
import { parse, type GraphQLSchema, type GraphQLError, Source } from 'graphql'
import {
  FieldNotFoundError,
  FragmentNotFoundError,
  Generator,
  type GeneratorOutputFile,
  TypeNotFoundError,
  type GeneratorOutputOperation,
} from 'graphql-typescript-deluxe'
import type { WatchEvent } from 'nuxt/schema'
import colors from 'picocolors'
import { logger } from '../helpers'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import type { RpcItem } from '../rpc-types'
import { logAllEntries, SYMBOL_CROSS, type LogEntry } from './logging'
import { CollectedFile } from './CollectedFile'
import { Template } from '../runtime/settings'
import type { ModuleHelper } from './ModuleHelper'
import ResponseTypes from './templates/ResponseTypes'
import NitroTypes from './templates/NitroTypes'
import OperationSources from './templates/OperationSources'

export type CollectorWatchEventResult = {
  hasChanged: boolean
  affectedOperations: string[]
  error?: { message: string }
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
   * The generated templates.
   */
  private templates: Map<Template, string> = new Map()

  constructor(
    private schema: GraphQLSchema,
    private helper: ModuleHelper,
  ) {
    const mappedOptions = { ...helper.options.codegenConfig }
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

  public async reset() {
    this.files.clear()
    this.generator.reset()
    this.operationTimestamps.clear()
    this.rpcItems.clear()
  }

  public async updateSchema(schema: GraphQLSchema) {
    this.schema = schema
    this.generator.updateSchema(schema)
    await this.reset()
    await this.initDocuments()
  }

  private filePathToBuildRelative(filePath: string): string {
    return './' + this.helper.toBuildRelative(filePath)
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

  private buildOutputTypes(file: GeneratorOutputFile): string {
    let output = ''
    const enumImports = file.getTypeScriptEnumDependencies()

    if (enumImports.length) {
      output += `import type { ${enumImports.join(', ')} } from './enums'\n\n`
    }

    output += file.getSource()

    return output
  }

  private updateTemplate(template: Template, content: string) {
    this.templates.set(template, content)
  }

  public getTemplate(template: Template): string {
    const content = this.templates.get(template)
    if (content === undefined) {
      throw new Error(`Missing template content: ${template}`)
    }

    return content
  }

  /**
   * Executes code gen and performs validation for operations.
   */
  private buildState() {
    const output = this.generator.build()
    const operations = output.getCollectedOperations()
    const generatedCode = output.getGeneratedCode()

    this.updateTemplate(
      Template.Documents,
      output
        .getOperationsFile({
          exportName: 'documents',
          minify: !this.helper.isDev,
        })
        .getSource(),
    )

    this.updateTemplate(
      Template.OperationTypesAll,
      output
        .getOperationTypesFile({
          importFrom: './../graphql-operations',
        })
        .getSource(),
    )

    this.updateTemplate(
      Template.NitroTypes,
      NitroTypes(operations, this.helper.options.serverApiPrefix),
    )

    this.updateTemplate(
      Template.OperationTypes,
      this.buildOutputTypes(output.getTypes()),
    )

    this.updateTemplate(
      Template.ResponseTypes,
      ResponseTypes(operations, this.helper),
    )

    this.updateTemplate(Template.Enums, output.buildFile(['enum']).getSource())

    this.updateTemplate(
      Template.OperationSources,
      OperationSources(operations, this.helper.paths.root),
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

      const shouldLog = errors.length || !this.helper.options.logOnlyErrors

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
   * Initialise the collector.
   *
   * In dev mode, the method will call itself recursively until all documents
   * are valid.
   *
   * If not in dev mode the method will throw an error when documents are not
   * valid.
   */
  public async init(): Promise<void> {
    try {
      await this.initDocuments()
    } catch (e) {
      if (this.helper.isDev) {
        const shouldRevalidate = await this.helper.prompt.confirm(
          'Do you want to revalidate the GraphQL documents?',
        )

        if (shouldRevalidate === 'yes') {
          await this.reset()
          return this.init()
        }
      }
      throw new Error('Graphql document validation failed.')
    }
  }

  /**
   * Initialise the collector.
   */
  private async initDocuments() {
    try {
      // Get all files that match the import patterns.
      const files = await this.helper.getImportPatternFiles()

      for (const filePath of files) {
        await this.addFile(filePath)
      }

      const nuxtConfigDocuments = this.helper.options.documents.join('\n\n')

      if (nuxtConfigDocuments.length) {
        const filePath = this.helper.paths.nuxtConfig
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
  private async addFile(filePath: string): Promise<CollectedFile | null> {
    const file = await CollectedFile.fromFilePath(filePath)
    // Skip empty files.
    if (!file.fileContents) {
      return null
    }
    this.files.set(filePath, file)
    this.generator.add({
      filePath,
      documentNode: file.parsed,
    })
    return file
  }

  private async handleAdd(filePath: string): Promise<boolean> {
    if (!this.helper.matchesImportPattern(filePath)) {
      return false
    }
    const result = await this.addFile(filePath)
    return !!result
  }

  private async handleChange(filePath: string): Promise<boolean> {
    if (!this.helper.matchesImportPattern(filePath)) {
      return false
    }
    const file = this.files.get(filePath)

    // If the file does not yet exist, it might have been skipped when it was
    // added (e.g. because it's empty).
    if (!file) {
      return this.handleAdd(filePath)
    }

    try {
      const needsUpdate = await file.update()
      if (!needsUpdate) {
        return false
      }
      this.generator.update({
        filePath: filePath,
        documentNode: file.parsed,
      })
    } catch {
      // Error: File is invalid (e.g. empty), so let's remove it.
      return this.handleUnlink(filePath)
    }

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
  ): Promise<CollectorWatchEventResult> {
    let hasChanged = false
    const oldOperationTimestamps = new Map(this.operationTimestamps)
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
        affectedOperations: [],
        error: { message: this.buildErrorMessage(e) },
      }
    }

    const affectedOperations: string[] = []

    if (hasChanged) {
      logger.success('Finished GraphQL code update successfully.')

      for (const [name, newTimestamp] of this.operationTimestamps) {
        const oldTimestamp = oldOperationTimestamps.get(name)
        if (!oldTimestamp || oldTimestamp !== newTimestamp) {
          affectedOperations.push(name)
        }
      }
    }

    return { hasChanged, affectedOperations }
  }
}
