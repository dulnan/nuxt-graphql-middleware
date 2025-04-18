import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerImports,
  addTemplate,
  addTypeTemplate,
  createResolver,
  resolveAlias,
  resolveFiles,
  type Resolver,
} from '@nuxt/kit'
import { relative } from 'pathe'
import type { RouterMethod } from 'h3'
import type { Nuxt, ResolvedNuxtTemplate } from 'nuxt/schema'
import type { ModuleOptions } from './types/options'
import { defu } from 'defu'
import { defaultOptions, fileExists, logger, validateOptions } from './helpers'
import micromatch from 'micromatch'
import { ConsolePrompt } from './ConsolePrompt'
import type { StaticTemplate } from './templates/defineTemplate'

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

type RequiredModuleOptions = WithRequired<
  ModuleOptions,
  keyof typeof defaultOptions
>

type ModuleHelperResolvers = {
  /**
   * Resolver for paths relative to the module root.
   */
  module: Resolver

  /**
   * Resolve relative to the app's server directory.
   */
  server: Resolver

  /**
   * Resolve relative to the Nuxt src folder.
   */
  src: Resolver

  /**
   * Resolve relative to the Nuxt app directory.
   */
  app: Resolver

  /**
   * Resolve relative to the Nuxt root.
   *
   * Should be where nuxt.config.ts is located.
   */
  root: Resolver
}

type ModuleHelperPaths = {
  runtimeTypes: string
  root: string
  nuxtConfig: string
  serverDir: string
  schema: string
  serverOptions: string | null
  clientOptions: string | null
  moduleBuildDir: string
  moduleTypesDir: string
}

export class ModuleHelper {
  public readonly resolvers: ModuleHelperResolvers
  public readonly paths: ModuleHelperPaths

  public readonly isDev: boolean

  public readonly options: RequiredModuleOptions

  public readonly prompt: ConsolePrompt = new ConsolePrompt()

  private nitroExternals: string[] = []
  private tsPaths: Record<string, string> = {}

  constructor(
    private nuxt: Nuxt,
    moduleUrl: string,
    options: ModuleOptions,
  ) {
    const isModuleBuild =
      process.env.PLAYGROUND_MODULE_BUILD === 'true' && nuxt.options._prepare

    const mergedOptions = defu({}, options, defaultOptions)
    // Add sane default for the autoImportPatterns option.
    // We don't want to add them to the default options, because defu would
    // merge the array with the array provided by the user.
    if (!mergedOptions.autoImportPatterns) {
      mergedOptions.autoImportPatterns = [
        '~~/**/*.{gql,graphql}',
        '!node_modules',
      ]
    }
    // When running dev:prepare during module development we have to "fake"
    // options to use the playground.
    if (isModuleBuild) {
      mergedOptions.graphqlEndpoint = 'http://localhost'
      mergedOptions.downloadSchema = false
      mergedOptions.schemaPath = '~~/schema.graphql'
      mergedOptions.autoImportPatterns = [
        '~~/playground/**/*.{gql,graphql}',
        '!node_modules',
      ]
    }

    // Gather all aliases for each layer.
    const layerAliases = nuxt.options._layers.map((layer) => {
      // @see https://nuxt.com/docs/api/nuxt-config#alias
      return {
        '~~': layer.config.rootDir,
        '@@': layer.config.rootDir,
        '~': layer.config.srcDir,
        '@': layer.config.srcDir,
        // Merge any additional aliases defined by the layer.
        // Must be last so that the layer may override the "default" aliases.
        ...(layer.config.alias || {}),
      }
    })

    // Resolver for the root directory.
    const srcResolver = createResolver(nuxt.options.srcDir)
    const rootResolver = createResolver(nuxt.options.rootDir)

    mergedOptions.autoImportPatterns = (
      mergedOptions.autoImportPatterns || []
    ).flatMap((pattern) => {
      if (pattern.startsWith('!') || pattern.startsWith('/')) {
        // Skip resolving for ignore patterns or absolute paths.
        return pattern
      } else if (pattern.startsWith('~') || pattern.startsWith('@')) {
        // Any of the internal Nuxt aliases need to be resolved for each layer.
        // @see https://nuxt.com/docs/api/nuxt-config#alias
        return layerAliases.map((aliases) => resolveAlias(pattern, aliases))
      }

      // The path starts with a dot, so we resolve it relative to the app root
      // directory, which is where the nuxt.config.ts file is located.
      return rootResolver.resolve(pattern)
    })

    this.options = mergedOptions as RequiredModuleOptions

    // Will throw an error if the options are not valid.
    if (!nuxt.options._prepare) {
      validateOptions(this.options)
    }

    this.isDev = nuxt.options.dev
    this.resolvers = {
      module: createResolver(moduleUrl),
      server: createResolver(nuxt.options.serverDir),
      src: srcResolver,
      app: createResolver(nuxt.options.dir.app),
      root: rootResolver,
    }

    this.paths = {
      runtimeTypes: '',
      root: nuxt.options.rootDir,
      nuxtConfig: this.resolvers.root.resolve('nuxt.config.ts'),
      serverDir: nuxt.options.serverDir,
      schema: this.resolvers.root.resolve(
        resolveAlias(this.options.schemaPath),
      ),
      serverOptions: '',
      clientOptions: this.findClientOptions(),
      moduleBuildDir: nuxt.options.buildDir + '/nuxt-graphql-middleware',
      moduleTypesDir: nuxt.options.buildDir + '/graphql-operations',
    }

    // This path needs to be built afterwards since the method we call
    // depends on a value of this.paths.
    this.paths.runtimeTypes = this.toModuleBuildRelative(
      this.resolvers.module.resolve('./runtime/types.ts'),
    )

    this.paths.serverOptions = this.findServerOptions()
  }

  /**
   * Find the path to the graphqlMiddleware.serverOptions.ts file.
   */
  private findServerOptions(): string | null {
    // Look for the file in the server directory.
    const newPath = this.resolvers.server.resolve(
      'graphqlMiddleware.serverOptions',
    )
    const serverPath = fileExists(newPath)

    if (serverPath) {
      return serverPath
    }

    // Check for previous locations of the server options file that are not
    // supported anymore.
    const candidates: string[] = [
      this.resolvers.root.resolve('graphqlMiddleware.serverOptions'),
      this.resolvers.root.resolve('app/graphqlMiddleware.serverOptions'),
      this.resolvers.src.resolve('graphqlMiddleware.serverOptions'),
    ]

    for (let i = 0; i < candidates.length; i++) {
      const path = candidates[i]
      const filePath = fileExists(path)

      // File exists. Throw an error so that module users can migrate.
      if (filePath) {
        throw new Error(
          `The graphqlMiddleware.serverOptions file should be placed in Nuxt's <serverDir> ("${this.paths.serverDir}/graphqlMiddleware.serverOptions.ts").`,
        )
      }
    }

    logger.info('No graphqlMiddleware.serverOptions file found.')
    return null
  }

  private findClientOptions(): string | null {
    const clientOptionsPath = this.resolvers.app.resolve(
      'graphqlMiddleware.clientOptions',
    )

    if (fileExists(clientOptionsPath)) {
      return clientOptionsPath
    }

    return null
  }

  /**
   * Transform the path relative to the module's build directory.
   *
   * @param path - The absolute path.
   *
   * @returns The path relative to the module's build directory.
   */
  public toModuleBuildRelative(path: string): string {
    return relative(this.paths.moduleBuildDir, path)
  }

  /**
   * Transform the path relative to the Nuxt build directory.
   *
   * @param path - The absolute path.
   *
   * @returns The path relative to the module's build directory.
   */
  public toBuildRelative(path: string): string {
    return relative(this.nuxt.options.buildDir, path)
  }

  /**
   * Get all file paths that match the import patterns.
   */
  public async getImportPatternFiles(): Promise<string[]> {
    return resolveFiles(
      this.nuxt.options.srcDir,
      this.options.autoImportPatterns,
    )
  }

  public matchesImportPattern(filePath: string): boolean {
    // Use micromatch to match using globs, but also check if the file path
    // exists as a literal string in the patterns array.
    return (
      micromatch.isMatch(filePath, this.options.autoImportPatterns) ||
      this.options.autoImportPatterns.includes(filePath)
    )
  }

  public addAlias(name: string, path: string) {
    this.nuxt.options.alias[name] = path

    // In our case, the name of the alias corresponds to a folder in the build
    // dir with the same name (minus the #).
    const pathFromName = `./${name.substring(1)}`

    this.tsPaths[name] = pathFromName
    this.tsPaths[name + '/*'] = pathFromName + '/*'

    // Add the alias as an external so that the nitro server build doesn't fail.
    this.inlineNitroExternals(name)
  }

  public inlineNitroExternals(arg: ResolvedNuxtTemplate | string) {
    const path = typeof arg === 'string' ? arg : arg.dst
    this.nitroExternals.push(path)
    this.transpile(path)
  }

  public transpile(path: string) {
    this.nuxt.options.build.transpile.push(path)
  }

  public applyBuildConfig() {
    // Workaround for https://github.com/nuxt/nuxt/issues/28995
    this.nuxt.options.nitro.externals ||= {}
    this.nuxt.options.nitro.externals.inline ||= []
    this.nuxt.options.nitro.externals.inline.push(...this.nitroExternals)

    // Currently needed due to a bug in Nuxt that does not add aliases for
    // nitro. As this has happened before in the past, let's leave it so that
    // we are guaranteed to have these aliases also for server types.
    this.nuxt.options.nitro.typescript ||= {}
    this.nuxt.options.nitro.typescript.tsConfig ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths ||= {}

    this.nuxt.options.typescript.tsConfig ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths ||= {}

    for (const [name, path] of Object.entries(this.tsPaths)) {
      this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[name] =
        [path]
      this.nuxt.options.typescript.tsConfig.compilerOptions.paths[name] = [path]
    }
  }

  public processTemplate(path: string, content: string) {
    if (path.includes('graphql-operations/') || path.endsWith('.graphql')) {
      return content.trim()
    }
    const name = path.split('/')[1]
    return `/*
 * @see [Documentation](https://nuxt-graphql-middleware.dulnan.net/advanced/templates#${name})
 */
${content.trim()}`
  }

  public addTemplate(template: StaticTemplate) {
    if (template.build) {
      const content = this.processTemplate(
        template.options.path,
        template.build(this),
      )
      addTemplate({
        filename: template.options.path + '.js',
        write: true,
        getContents: () => content,
      })
    }
    if (template.buildTypes) {
      const content = this.processTemplate(
        template.options.path,
        template.buildTypes(this),
      )
      const filename = template.options.path + '.d.ts'
      addTypeTemplate({
        filename: filename as `${string}.d.ts`,
        write: true,
        getContents: () => content,
      })
    }
  }

  public addPlugin(name: string) {
    addPlugin(this.resolvers.module.resolve('./runtime/plugins/' + name), {
      append: false,
    })
  }

  public addServerHandler(name: string, path: string, method: RouterMethod) {
    addServerHandler({
      handler: this.resolvers.module.resolve('./runtime/server/api/' + name),
      route: this.options.serverApiPrefix + path,
      method,
    })
  }

  public addComposable(name: string) {
    addImports({
      from: this.resolvers.module.resolve('./runtime/composables/' + name),
      name,
    })
  }

  public addServerUtil(name: string) {
    addServerImports([
      {
        from: this.resolvers.module.resolve('./runtime/server/utils/' + name),
        name,
      },
    ])
  }
}
