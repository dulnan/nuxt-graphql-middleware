import type { Collector } from './Collector'
import type { SchemaProvider } from './SchemaProvider'
import type { GraphQLSchema } from 'graphql'

export class ModuleContext {
  constructor(
    private schemaProvider: SchemaProvider,
    private collector: Collector,
  ) {}

  /**
   * Return the GraphQL schema.
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
   * Add an additional static document.
   *
   * @param identifier - The unique identifier for your document.
   * @param source - The document source.
   */
  public addDocument(identifier: string, source: string): ModuleContext {
    this.collector.addHookFile(identifier, source)
    return this
  }
}
