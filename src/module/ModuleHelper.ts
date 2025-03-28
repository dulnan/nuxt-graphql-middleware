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
import { defaultOptions, fileExists, logger, validateOptions } from '../helpers'
import * as micromatch from 'micromatch'
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

  constructor(
    private nuxt: Nuxt,
    moduleUrl: string,
    options: ModuleOptions,
  ) {
    const isModuleBuild =
      process.env.MODULE_BUILD === 'true' && nuxt.options._prepare

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
    mergedOptions.autoImportPatterns = (
      mergedOptions.autoImportPatterns || []
    ).map((pattern) => {
      // Resolves aliases such as `~` or `#custom`.
      return resolveAlias(pattern)
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
      src: createResolver(nuxt.options.srcDir),
      app: createResolver(nuxt.options.dir.app),
      root: createResolver(nuxt.options.rootDir),
    }

    this.paths = {
      runtimeTypes: '',
      root: nuxt.options.rootDir,
      nuxtConfig: this.resolvers.root.resolve('nuxt.config.ts'),
      serverDir: nuxt.options.serverDir,
      schema: this.resolvers.root.resolve(
        resolveAlias(this.options.schemaPath),
      ),
      serverOptions: this.findServerOptions(),
      clientOptions: this.findClientOptions(),
      moduleBuildDir: nuxt.options.buildDir + '/nuxt-graphql-middleware',
      moduleTypesDir: nuxt.options.buildDir + '/graphql-operations',
    }

    // This path needs to be built afterwards since the method we call
    // depends on a value of this.paths.
    this.paths.runtimeTypes = this.toModuleBuildRelative(
      this.resolvers.module.resolve('./runtime/types.ts'),
    )
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
      {
        followSymbolicLinks: false,
      },
    )
  }

  public matchesImportPattern(filePath: string): boolean {
    return micromatch.isMatch(filePath, this.options.autoImportPatterns)
  }

  public addAlias(name: string, path: string) {
    this.nuxt.options.alias[name] = path

    // In our case, the name of the alias corresponds to a folder in the build
    // dir with the same name (minus the #).
    const pathFromName = `./${name.substring(1)}`

    // Currently needed due to a bug in Nuxt that does not add aliases for
    // nitro. As this has happened before in the past, let's leave it so that
    // we are guaranteed to have these aliases also for server types.
    this.nuxt.options.nitro.typescript ||= {}
    this.nuxt.options.nitro.typescript.tsConfig ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths ||= {}
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[name] = [
      pathFromName,
    ]
    this.nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[
      name + '/*'
    ] = [pathFromName + '/*']

    // Currently needed due to a bug in Nuxt that does not add aliases for
    // nitro. As this has happened before in the past, let's leave it so that
    // we are guaranteed to have these aliases also for server types.
    this.nuxt.options.typescript.tsConfig ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths ||= {}
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths[name] = [
      pathFromName,
    ]
    this.nuxt.options.typescript.tsConfig.compilerOptions.paths[name + '/*'] = [
      pathFromName + '/*',
    ]

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
  }

  public addTemplate(template: StaticTemplate) {
    if (template.build) {
      const content = template.build(this).trim()
      addTemplate({
        filename: template.options.path + '.js',
        write: true,
        getContents: () => content,
      })
    }
    if (template.buildTypes) {
      const content = template.buildTypes(this).trim()
      const filename = template.options.path + '.d.ts'
      addTypeTemplate({
        filename: filename as `${string}.d.ts`,
        write: true,
        getContents: () => content,
      })
    }
  }

  public addPlugin(path: string) {
    addPlugin(this.resolvers.module.resolve(path), {
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
