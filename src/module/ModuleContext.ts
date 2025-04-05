import type { Collector } from './Collector'
import type { SchemaProvider } from './SchemaProvider'
import type { GraphQLNamedType, GraphQLSchema } from 'graphql'

/**
 * The public module context class.
 */
export class ModuleContext {
  constructor(
    private schemaProvider: SchemaProvider,
    private collector: Collector,
  ) {}

  /**
   * Return the GraphQL schema.
   *
   * Note that the schema may be updated during development, so it can become
   * stale. Prefer using methods like `schemaHasType()` to query the schema.
   *
   * @returns The GraphQL schema.
   */
  public getSchema(): GraphQLSchema {
    return this.schemaProvider.getSchema()
  }

  /**
   * Check if the given GraphQL type (interface, concrete type, enum, input type)
   * exists in the schema.
   *
   * @param name - The name of the type.
   *
   * @returns True if the type exists in the schema.
   */
  public schemaHasType(name: string): boolean {
    return !!this.schemaProvider.getSchema().getType(name)
  }

  /**
   * Get a type from the schema.
   *
   * @param name - The name of the type.
   *
   * @returns The type.
   */
  public schemaGetType(name: string): GraphQLNamedType | undefined {
    return this.schemaProvider.getSchema().getType(name)
  }

  /**
   * Add an additional static document.
   *
   * @param identifier - The unique identifier for your document.
   * @param source - The document source.
   */
  public addDocument(identifier: string, source: string): ModuleContext {
    this.collector.addHookDocument(identifier, source)
    return this
  }

  /**
   * Add an additional GraphQL file to import.
   *
   * @param filePath - The absolute path to the file.
   */
  public addImportFile(filePath: string): ModuleContext {
    if (!filePath.startsWith('/')) {
      throw new Error(
        `The provided file path "${filePath}" must be an absolute path.`,
      )
    }

    if (!filePath.endsWith('.graphql') && !filePath.endsWith('.gql')) {
      throw new Error(
        `The provided file path "${filePath}" should have a .graphql or .gql extension.`,
      )
    }

    this.collector.addHookFile(filePath)
    return this
  }
}
