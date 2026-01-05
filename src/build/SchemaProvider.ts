import fs from 'node:fs/promises'
import { logger } from './helpers'
import { generate } from '@graphql-codegen/cli'
import type { Types } from '@graphql-codegen/plugin-helpers'
import type { SchemaASTConfig } from '@graphql-codegen/schema-ast'
import * as PluginSchemaAst from '@graphql-codegen/schema-ast'
import { loadSchema } from '@graphql-tools/load'
import type { GraphQLSchema } from 'graphql'
import type { ModuleHelper } from './ModuleHelper'

/**
 * Handles downloading, loading and saving the GraphQL schema.
 */
export class SchemaProvider {
  /**
   * The raw schema content.
   */
  private schemaContent = ''

  /**
   * The parsed schema object.
   */
  private schema: GraphQLSchema | null = null

  constructor(private helper: ModuleHelper) {}

  public async init(): Promise<void> {
    try {
      await this.loadSchema()
    } catch (error) {
      logger.error(error)
      const hasLoaded = await this.loadFromDiskFallback()
      if (!hasLoaded) {
        throw new Error('Failed to load GraphQL schema.')
      }
    }
  }

  private async loadFromDiskFallback(): Promise<boolean> {
    const hasSchemaOnDisk = await this.hasSchemaOnDisk()
    if (
      this.helper.isDev &&
      hasSchemaOnDisk &&
      this.helper.shouldDownloadSchema()
    ) {
      const shouldUseFromDisk = await this.helper.prompt.confirm(
        'Do you want to continue with the previously downloaded schema from disk?',
      )
      if (shouldUseFromDisk === 'yes') {
        await this.loadSchema({ forceDisk: true })
        return true
      }
    }

    return false
  }

  /**
   * Loads the schema from disk.
   *
   * @returns The schema contents from disk.
   */
  private async loadSchemaFromDisk(): Promise<string> {
    const fileExists = await this.hasSchemaOnDisk()
    if (!fileExists) {
      logger.error(
        '"downloadSchema" is set to false but no schema exists at ' +
          this.helper.paths.schema,
      )
      throw new Error('Missing GraphQL schema.')
    }
    if (!this.helper.isPrepare) {
      logger.info(
        `Loading GraphQL schema from disk: ${this.helper.paths.schema}`,
      )
    }
    return await fs.readFile(this.helper.paths.schema).then((v) => v.toString())
  }

  /**
   * Downloads the schema and saves it to disk.
   *
   * @returns The schema contents.
   */
  private downloadSchema(): Promise<string> {
    const endpoint = this.helper.options.graphqlEndpoint
    if (!endpoint) {
      throw new Error('Missing graphqlEndpoint config.')
    }
    const pluginConfig: Types.UrlSchemaOptions | undefined =
      this.helper.options.codegenSchemaConfig?.urlSchemaOptions

    const schemaAstConfig: SchemaASTConfig = this.helper.options
      .codegenSchemaConfig?.schemaAstConfig || {
      sort: true,
    }

    const config: Types.Config & {
      cwd?: string
    } = {
      schema: endpoint,
      pluginLoader: (name: string) => {
        switch (name) {
          case '@graphql-codegen/schema-ast':
            return Promise.resolve(PluginSchemaAst)
        }

        throw new Error(`graphql-codegen plugin not found: ${name}`)
      },
      silent: true,
      errorsOnly: true,
      config: pluginConfig,

      generates: {
        [this.helper.paths.schema]: {
          plugins: ['schema-ast'],
          config: schemaAstConfig,
        },
      },
    }

    logger.info(`Downloading GraphQL schema from "${endpoint}".`)

    return generate(config, true).then((v) => v[0]?.content)
  }

  /**
   * Determine if the schema exists on disk.
   *
   * @returns True if the schema file exists on disk.
   */
  public hasSchemaOnDisk(): Promise<boolean> {
    return fs
      .access(this.helper.paths.schema)
      .then(() => true)
      .catch(() => false)
  }

  /**
   * Load the schema either from disk or by downloading it.
   *
   * @param forceDownload - Forces downloading the schema.
   */
  public async loadSchema(opts?: {
    forceDownload?: boolean
    forceDisk?: boolean
  }) {
    if (opts?.forceDisk) {
      this.schemaContent = await this.loadSchemaFromDisk()
    } else if (this.helper.shouldDownloadSchema() || opts?.forceDownload) {
      this.schemaContent = await this.downloadSchema()
    } else {
      this.schemaContent = await this.loadSchemaFromDisk()
    }

    this.schema = await loadSchema(this.schemaContent, {
      loaders: [],
    })
  }

  /**
   * Get the schema.
   *
   * @returns The parsed GraphQL schema object.
   */
  public getSchema(): GraphQLSchema {
    if (!this.schema) {
      throw new Error('Failed to load schema.')
    }

    return this.schema
  }
}
