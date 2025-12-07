import { type GraphQLSchema, printType } from 'graphql'
import type { GetSchemaTypeDefinitionResponse } from './types'

export function handleGetSchemaTypeDefinition(
  schema: GraphQLSchema,
  name: string,
): GetSchemaTypeDefinitionResponse {
  const type = schema.getType(name)

  if (!type) {
    return { definition: null, error: `Type "${name}" not found in schema` }
  }

  return { definition: printType(type) }
}
