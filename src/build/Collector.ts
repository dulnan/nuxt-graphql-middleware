import { basename } from 'node:path'
import { relative } from 'pathe'
import { parse, type GraphQLSchema, type GraphQLError, Source } from 'graphql'
import {
  FieldNotFoundError,
  FragmentNotFoundError,
  Generator,
  TypeNotFoundError,
  type GeneratorOutputOperation,
} from 'graphql-typescript-deluxe'
import type { WatchEvent } from 'nuxt/schema'
import colors from 'picocolors'
import { logger } from './helpers'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import type { RpcItem } from './types/rpc'
import { logAllEntries, SYMBOL_CROSS, type LogEntry } from './logging'
import { CollectedFile } from './CollectedFile'
import type { ModuleHelper } from './ModuleHelper'
import { addServerTemplate, addTemplate } from '@nuxt/kit'
import type { GeneratorTemplate } from './templates/defineTemplate'
import type { CollectorOperation, CollectorFragment } from './types/collector'

export type { CollectorOperation, CollectorFragment }

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
   * All documents provided by hooks.
   */
  private hookDocuments = new Map<string, string>()

  /**
   * All file paths provided by hooks.
   */
  private hookFiles = new Set<string>()

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
   * The registered templates.
   */
  private templates: GeneratorTemplate[] = []

  /**
   * The generated template contents.
   */
  private templateResult: Map<string, string> = new Map()

  /**
   * Operations with full metadata for MCP tools.
   */
  private operations: CollectorOperation[] = []

  /**
   * Fragments with full metadata for MCP tools.
   */
  private fragments: CollectorFragment[] = []

  private isInitialised = false

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
        if (filePath.startsWith('/')) {
          return this.filePathToBuildRelative(filePath)
        } else if (filePath.startsWith('hook:')) {
          return './../nuxt-graphql-middleware/hook-documents.graphql'
        }

        return filePath
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
    return './' + this.helper.toModuleBuildRelative(filePath)
  }

  private filePathToSourceRelative(filePath: string): string {
    if (filePath.startsWith('/')) {
      return './' + relative(process.cwd(), filePath)
    } else if (filePath.startsWith('hook:')) {
      const hookPathAbsolute =
        this.helper.paths.moduleBuildDir + '/hook-documents.graphql'
      return './' + relative(process.cwd(), hookPathAbsolute)
    }

    return filePath
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

  private getTemplate(template: string, type: 'default' | 'types'): string {
    const content = this.templateResult.get(template + '-' + type)
    if (content === undefined) {
      throw new Error(`Missing template content: ${template}`)
    }

    return content
  }

  /**
   * Executes code gen and performs validation for operations.
   */
  private async buildState(): Promise<void> {
    const output = this.generator.build()
    const operations = output.getCollectedOperations()
    const generatedCode = output.getGeneratedCode()

    this.templates.forEach((template) => {
      const path = template.options.path
      if (template.build) {
        this.templateResult.set(
          path + '-default',
          this.helper.processTemplate(
            template.options.path,
            template.build(output, this.helper, this),
          ),
        )
      }

      if (template.buildTypes) {
        this.templateResult.set(
          template.options.path + '-types',
          this.helper.processTemplate(
            template.options.path,
            template.buildTypes(output, this.helper, this),
          ),
        )
      }
    })

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

      const shouldLog =
        errors.length ||
        (!this.helper.isPrepare && !this.helper.options.logOnlyErrors)

      if (shouldLog) {
        logEntries.push(this.operationToLogEntry(operation, errors))
      }
    }

    logAllEntries(
      logEntries.sort((a, b) => {
        // Sort by operation type and then operation name.
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      }),
    )

    if (hasErrors) {
      throw new Error('GraphQL errors')
    }

    await this.helper.nuxt.callHook('nuxt-graphql-middleware:build', { output })

    // Build operations and fragments metadata for MCP tools (dev only).
    if (this.helper.isDev) {
      this.operations = operations.map((op) => {
        // Build fragment dependencies for sourceFull.
        const fragmentDeps = op
          .getGraphQLFragmentDependencies()
          .map((name) => fragmentMap.get(name) || '')
          .join('\n')

        // source is just the operation itself.
        const source = operationSourceMap.get(op.graphqlName) || ''
        // sourceFull includes all fragment dependencies.
        const sourceFull = [source, fragmentDeps].join('\n')

        return {
          name: op.graphqlName,
          type: op.operationType as 'query' | 'mutation',
          filePath: op.filePath,
          relativeFilePath: this.filePathToSourceRelative(op.filePath),
          hasVariables: op.hasVariables,
          needsVariables: op.needsVariables,
          variablesTypeName: op.variablesTypeName,
          responseTypeName: op.typeName,
          source,
          sourceFull,
        }
      })

      // Build fragments metadata.
      const outputFragments = output.getFragments()
      this.fragments = outputFragments.map((frag) => {
        // source is just this fragment itself.
        const source = fragmentMap.get(frag.node.name.value) || ''
        // Build fragment dependencies for sourceFull.
        const fragmentDeps = frag
          .getGraphQLFragmentDependencies()
          .map((name) => fragmentMap.get(name) || '')
          .join('\n')
        // sourceFull includes all dependencies.
        const sourceFull = [source, fragmentDeps].join('\n')

        return {
          name: frag.node.name.value,
          typeName: frag.node.typeCondition.name.value,
          filePath: frag.filePath,
          relativeFilePath: this.filePathToSourceRelative(frag.filePath),
          source,
          sourceFull,
          dependencies: frag.getGraphQLFragmentDependencies(),
        }
      })
    }

    if (this.helper.isDev) {
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
            .join('\n')
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
    } catch {
      if (this.helper.isDev) {
        const shouldRevalidate = await this.helper.prompt.confirm(
          'Do you want to revalidate the GraphQL documents?',
        )

        if (shouldRevalidate === 'yes') {
          await this.reset()
          await this.init()
          this.isInitialised = true
          return
        }
      }
      throw new Error('Graphql document validation failed.')
    }
  }

  public addHookDocument(identifier: string, source: string) {
    this.hookDocuments.set('hook:' + identifier, source)
  }

  public async addOrUpdateHookDocument(
    identifier: string,
    source: string,
  ): Promise<void> {
    const fullIdentifier = 'hook:' + identifier
    const exists = this.hookDocuments.has(fullIdentifier)
    this.hookDocuments.set(fullIdentifier, source)
    if (exists && this.isInitialised) {
      this.generator.update({
        filePath: fullIdentifier,
        document: source,
      })
      await this.buildState()
    }
  }

  public addHookFile(filePath: string) {
    this.hookFiles.add(filePath)
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

      const hookDocuments = [...this.hookDocuments.entries()]
      hookDocuments.forEach(([identifier, source]) => {
        const file = new CollectedFile(identifier, source, false)
        this.files.set(identifier, file)
        this.generator.add({
          filePath: identifier,
          documentNode: file.parsed,
        })
      })

      for (const filePath of this.hookFiles) {
        await this.addFile(filePath)
      }

      await this.buildState()
      if (!this.helper.isPrepare) {
        logger.success('All GraphQL documents are valid.')
      }
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
    if (!file?.fileContents) {
      return null
    }

    this.files.set(filePath, file)
    this.generator.add({
      filePath,
      documentNode: file.parsed,
    })
    return file
  }

  private matchesPatternOrExists(filePath: string): boolean {
    return (
      this.files.has(filePath) ||
      this.hookFiles.has(filePath) ||
      this.hookDocuments.has(filePath) ||
      this.helper.matchesImportPattern(filePath)
    )
  }

  private async handleAdd(filePath: string): Promise<boolean> {
    if (!this.matchesPatternOrExists(filePath)) {
      return false
    }
    const result = await this.addFile(filePath)
    return !!result
  }

  private async handleChange(filePath: string): Promise<boolean> {
    if (!this.matchesPatternOrExists(filePath)) {
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
      }

      if (hasChanged) {
        await this.buildState()
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

  /**
   * Adds a virtual template (not written to disk) for both Nuxt and Nitro.
   *
   * For some reason a template written to disk works for both Nuxt and Nitro,
   * but a virtual template requires adding two templates.
   */
  private addVirtualTemplate(template: GeneratorTemplate) {
    const filename = template.options.path + '.js'
    const getContents = () => this.getTemplate(template.options.path, 'default')

    addTemplate({
      filename,
      getContents,
    })

    addServerTemplate({
      // Since this is a virtual template, the name must match the final
      // alias, example:
      // - nuxt-graphql-middleware/foobar.mjs => #nuxt-graphql-middleware/foobar
      //
      // That way we can reference the same template using the alias in both
      // Nuxt and Nitro environments.
      filename: '#' + template.options.path,
      getContents,
    })
  }

  /**
   * Adds a template that dependes on Collector state.
   */
  public addTemplate(template: GeneratorTemplate) {
    this.templates.push(template)

    if (template.build) {
      if (template.options.virtual) {
        this.addVirtualTemplate(template)
      } else {
        const path = template.options.path
        const filename = template.options.isFullPath ? path : path + '.js'
        addTemplate({
          filename,
          write: true,
          getContents: () => this.getTemplate(path, 'default'),
        })
      }
    }

    if (template.buildTypes) {
      const path = template.options.path
      const filename = (template.options.path + '.d.ts') as `${string}.d.ts`
      this.helper.registerTypeTemplate(filename, () =>
        this.getTemplate(path, 'types'),
      )
    }
  }

  /**
   * Get the hook documents.
   */
  public getHookDocuments(): { identifier: string; source: string }[] {
    return [...this.hookDocuments.entries()].map(([identifier, source]) => {
      return {
        identifier,
        source,
      }
    })
  }

  /**
   * Get the hook documents.
   */
  public getHookFiles(): string[] {
    return [...this.hookFiles.values()]
  }

  /**
   * Get all operations with metadata (for MCP tools).
   */
  public getOperations(): CollectorOperation[] {
    return this.operations
  }

  /**
   * Get all fragments for a specific GraphQL type (for MCP tools).
   */
  public getFragmentsForType(typeName: string): CollectorFragment[] {
    return this.fragments.filter((frag) => frag.typeName === typeName)
  }

  /**
   * Get all fragments (for MCP tools).
   */
  public getFragments(): CollectorFragment[] {
    return this.fragments
  }

  /**
   * Get a fragment by name (for MCP tools).
   */
  public getFragment(name: string): CollectorFragment | undefined {
    return this.fragments.find((frag) => frag.name === name)
  }
}
