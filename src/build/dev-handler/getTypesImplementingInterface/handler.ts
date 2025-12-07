import { isInterfaceType, type GraphQLSchema } from 'graphql'
import type { GetTypesImplementingInterfaceResponse } from './types'

export function handleGetTypesImplementingInterface(
  schema: GraphQLSchema,
  interfaceName: string,
): GetTypesImplementingInterfaceResponse {
  const interfaceType = schema.getType(interfaceName)

  if (!interfaceType) {
    return {
      interfaceName,
      types: [],
      error: `Type "${interfaceName}" not found in schema`,
    }
  }

  if (!isInterfaceType(interfaceType)) {
    return {
      interfaceName,
      types: [],
      error: `Type "${interfaceName}" is not an interface`,
    }
  }

  const implementingTypes = schema.getPossibleTypes(interfaceType)

  const types = implementingTypes.map((type) => ({
    name: type.name,
    description: type.description || null,
  }))

  // Sort alphabetically
  types.sort((a, b) => a.name.localeCompare(b.name))

  return { interfaceName, types }
}
