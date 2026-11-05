import { basename } from 'node:path'
import { isAbsolute, relative } from 'pathe'
import {
  parse,
  type DefinitionNode,
  type DocumentNode,
  type GraphQLSchema,
  GraphQLError,
  Kind,
  Source,
} from 'graphql'
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
import { addServerTemplate, addTemplate, getLayerDirectories } from '@nuxt/kit'
import type { GeneratorTemplate } from './templates/defineTemplate'
import type { CollectorOperation, CollectorFragment } from './types/collector'

export type { CollectorOperation, CollectorFragment }

export type CollectorWatchEventResult = {
  hasChanged: boolean
  affectedOperations: string[]
  error?: { message: string }
}

/**
 * The priority of documents and files provided via hooks: Below the app, but
 * above all extended layers.
 */
const HOOK_PRIORITY = 0.5

type DefinitionSource = {
  filePath: string
  priority: number
  label: string
}

/**
 * Get the key used to detect fragments and operations with the same name.
 *
 * Operations are keyed by name only, because the generator requires operation
 * names to be unique across queries and mutations.
 */
function getDefinitionKey(def: DefinitionNode): string | null {
  if (def.kind === Kind.FRAGMENT_DEFINITION) {
    return 'fragment:' + def.name.value
  } else if (def.kind === Kind.OPERATION_DEFINITION && def.name) {
    return 'operation:' + def.name.value
  }

  return null
}

function getDefinitionLabel(def: DefinitionNode): string {
  if (def.kind === Kind.FRAGMENT_DEFINITION) {
    return 'fragment ' + def.name.value
  } else if (def.kind === Kind.OPERATION_DEFINITION) {
    return def.operation + ' ' + def.name?.value
  }

  return def.kind
}

function isSameDefinitions(
  a: readonly DefinitionNode[],
  b: readonly DefinitionNode[],
): boolean {
  return a.length === b.length && a.every((def, i) => def === b[i])
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

  /**
   * The parsed document and the definitions of it last passed to the
   * generator, per file path.
   */
  private syncedDocuments = new Map<
    string,
    { parsed: DocumentNode; definitions: readonly DefinitionNode[] }
  >()

  /**
   * The priority per file path, see getPriority().
   */
  private priorities = new Map<string, number>()

  /**
   * The log message per overridden definition key, as logged during the last
   * generator sync.
   */
  private loggedOverrides = new Map<string, string>()

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
        if (isAbsolute(filePath)) {
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
    this.syncedDocuments.clear()
    this.priorities.clear()
    this.loggedOverrides.clear()
    this.generator.reset()
    this.operationTimestamps.clear()
    this.rpcItems.clear()
  }

  /**
   * Determine the priority of a file. Lower value = higher priority.
   *
   * Files in the app come first, followed by documents and files provided via
   * hooks and then the extended layers in the order they are defined. Files
   * that can't be matched to a layer get the lowest priority.
   */
  private getPriority(filePath: string): number {
    const cached = this.priorities.get(filePath)
    if (cached !== undefined) {
      return cached
    }

    let priority: number
    if (filePath.startsWith('hook:') || this.hookFiles.has(filePath)) {
      priority = HOOK_PRIORITY
    } else {
      const layers = getLayerDirectories(this.helper.nuxt)
      priority = layers.length
      // Layers can be nested inside the app (e.g. ~~/layers/foo), so the
      // longest matching directory wins.
      let longestMatch = 0
      layers.forEach((layer, index) => {
        for (const dir of [layer.root, layer.app]) {
          if (filePath.startsWith(dir) && dir.length > longestMatch) {
            priority = index
            longestMatch = dir.length
          }
        }
      })
    }

    this.priorities.set(filePath, priority)
    return priority
  }

  /**
   * Sync the collected files to the generator.
   *
   * When multiple files define a fragment or operation with the same name,
   * only the definition with the highest priority (see getPriority()) is passed
   * to the generator. This allows the app to override fragments and operations
   * of modules and layers. Definitions with the same priority are an error, see
   * checkCollisions(). In that case nothing is passed to the generator, so it
   * keeps the last valid state.
   */
  private syncGenerator(): void {
    const sourcesByKey = new Map<string, DefinitionSource[]>()
    for (const [filePath, file] of this.files) {
      const priority = this.getPriority(filePath)
      for (const def of file.parsed.definitions) {
        const key = getDefinitionKey(def)
        if (key) {
          const sources = sourcesByKey.get(key) || []
          sources.push({ filePath, priority, label: getDefinitionLabel(def) })
          sourcesByKey.set(key, sources)
        }
      }
    }

    const ownerPriorities = new Map<string, number>()
    for (const [key, sources] of sourcesByKey) {
      ownerPriorities.set(key, Math.min(...sources.map((v) => v.priority)))
    }

    this.checkCollisions(sourcesByKey, ownerPriorities)

    for (const [filePath, file] of this.files) {
      const priority = this.getPriority(filePath)
      const definitions = file.parsed.definitions.filter((def) => {
        const key = getDefinitionKey(def)
        return !key || ownerPriorities.get(key) === priority
      })

      const synced = this.syncedDocuments.get(filePath)
      if (
        synced &&
        synced.parsed === file.parsed &&
        isSameDefinitions(synced.definitions, definitions)
      ) {
        continue
      }

      const documentNode: DocumentNode =
        definitions.length === file.parsed.definitions.length
          ? file.parsed
          : { ...file.parsed, definitions }

      if (synced) {
        this.generator.update({ filePath, documentNode })
      } else {
        this.generator.add({ filePath, documentNode })
      }
      this.syncedDocuments.set(filePath, { parsed: file.parsed, definitions })
    }

    for (const filePath of [...this.syncedDocuments.keys()]) {
      if (!this.files.has(filePath)) {
        this.generator.remove(filePath)
        this.syncedDocuments.delete(filePath)
      }
    }
  }

  /**
   * Check fragments and operations that are defined in more than one file.
   *
   * Throws when the definitions with the highest priority are in more than one
   * file, e.g. two files of the app or documents of two modules: The generator
   * would silently use one of them.
   *
   * Overrides are logged, but only when they are new or have changed since the
   * last sync. Overriding a definition of a layer is the point of layers, so
   * that is only logged as info. Overriding a definition of a module is logged
   * as a warning, because the code of the module may rely on its fields.
   */
  private checkCollisions(
    sourcesByKey: Map<string, DefinitionSource[]>,
    ownerPriorities: Map<string, number>,
  ) {
    const toLabel = (source: DefinitionSource) => {
      const path = source.filePath.startsWith('hook:')
        ? source.filePath
        : this.filePathToSourceRelative(source.filePath)
      return `${source.label} (${path})`
    }

    const shouldLogOverrides =
      !this.helper.isPrepare && !this.helper.options.logOnlyErrors

    const duplicates: string[] = []
    const overrides = new Map<string, string>()
    for (const [key, sources] of sourcesByKey) {
      if (sources.length < 2) {
        continue
      }
      const priority = ownerPriorities.get(key)
      const owners = sources.filter((v) => v.priority === priority)
      if (owners.length > 1) {
        duplicates.push(owners.map(toLabel).join(', '))
        continue
      }

      const overridden = sources.filter((v) => v.priority !== priority)
      const message = `${owners.map(toLabel).join(', ')} overrides ${overridden.map(toLabel).join(', ')}`
      overrides.set(key, message)
      if (this.loggedOverrides.get(key) === message) {
        continue
      }

      if (overridden.some((v) => v.priority === HOOK_PRIORITY)) {
        logger.warn(
          `${message}. The overridden definition is provided by a module, which may rely on its fields. Rename the definition in the app if the override is not intended.`,
        )
      } else if (shouldLogOverrides) {
        logger.info(message)
      }
    }

    this.loggedOverrides = overrides

    if (duplicates.length) {
      throw new Error(
        'Multiple GraphQL definitions with the same name. Rename or remove all but one of them:\n' +
          duplicates.map((v) => '  - ' + v).join('\n'),
      )
    }
  }

  public getSchema(): GraphQLSchema {
    return this.schema
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
    if (isAbsolute(filePath)) {
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
      this.isInitialised = true
    } catch {
      if (this.helper.isDev) {
        const shouldRevalidate = await this.helper.prompt.confirm(
          'Do you want to revalidate the GraphQL documents?',
        )

        if (shouldRevalidate === 'yes') {
          await this.reset()
          await this.init()
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
      const file = new CollectedFile(fullIdentifier, source, false)
      this.files.set(fullIdentifier, file)
      this.syncGenerator()
      await this.buildState()
    }
  }

  public addHookFile(filePath: string) {
    this.hookFiles.add(filePath)
    this.priorities.delete(filePath)
  }

  /**
   * Get the documents of the documents option by the nuxt.config file that
   * defines them.
   *
   * Nuxt merges the options of all layers, so the documents of each layer are
   * taken from its own config. That way they rank as the layer (see
   * getPriority()). The remaining documents belong to the app: those of the
   * app's config, whose path Nuxt gives as "nuxt.config", and those from
   * inline module options.
   */
  private getConfigDocuments(): Map<string, string[]> {
    const remaining = [...this.helper.options.documents]
    const result = new Map<string, string[]>()

    for (const layer of this.helper.nuxt.options._layers) {
      const config = layer.config as {
        graphqlMiddleware?: { documents?: unknown }
      } | null
      const documents = config?.graphqlMiddleware?.documents
      if (
        !layer.configFile ||
        !isAbsolute(layer.configFile) ||
        !Array.isArray(documents)
      ) {
        continue
      }

      // Only documents that are still in the merged options are used.
      const own: string[] = []
      for (const document of documents) {
        const index = remaining.indexOf(document)
        if (index !== -1) {
          own.push(...remaining.splice(index, 1))
        }
      }
      if (own.length) {
        result.set(layer.configFile, own)
      }
    }

    if (remaining.length) {
      const filePath = this.helper.paths.nuxtConfig
      result.set(filePath, [...(result.get(filePath) ?? []), ...remaining])
    }

    return result
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

      for (const [filePath, documents] of this.getConfigDocuments()) {
        const file = new CollectedFile(filePath, documents.join('\n\n'), false)
        this.files.set(filePath, file)
      }

      const hookDocuments = [...this.hookDocuments.entries()]
      hookDocuments.forEach(([identifier, source]) => {
        const file = new CollectedFile(identifier, source, false)
        this.files.set(identifier, file)
      })

      for (const filePath of this.hookFiles) {
        await this.addFile(filePath)
      }

      this.syncGenerator()
      await this.buildState()
      if (!this.helper.isPrepare) {
        logger.success('All GraphQL documents are valid.')
      }
    } catch (e) {
      this.logError(e)

      // The error has already been logged above.
      // eslint-disable-next-line preserve-caught-error
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
    if (!result) {
      return false
    }
    this.syncGenerator()
    return true
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

    let needsUpdate: boolean
    try {
      needsUpdate = await file.update()
    } catch (e) {
      // Report syntax errors, but keep the last valid version of the file.
      // Removing it would silently activate definitions it overrides.
      if (e instanceof GraphQLError && file.fileContents.trim()) {
        throw new Error(
          `Failed to parse ${this.filePathToSourceRelative(filePath)}: ${e.message}`,
          { cause: e },
        )
      }

      // The file is empty or can't be read anymore, so let's remove it.
      return this.handleUnlink(filePath)
    }

    if (!needsUpdate) {
      return false
    }

    this.syncGenerator()
    return true
  }

  private handleUnlink(filePath: string): boolean {
    const file = this.files.get(filePath)
    if (!file) {
      return false
    }
    this.files.delete(filePath)
    this.syncGenerator()
    return true
  }

  private handleUnlinkDir(folderPath: string): boolean {
    const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/'
    let anyHasChanged = false
    for (const filePath of [...this.files.keys()]) {
      if (filePath.startsWith(prefix)) {
        this.files.delete(filePath)
        anyHasChanged = true
      }
    }

    if (anyHasChanged) {
      this.syncGenerator()
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
      this.helper.registerTypeTemplate(
        filename,
        () => this.getTemplate(path, 'types'),
        template.options.context,
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
