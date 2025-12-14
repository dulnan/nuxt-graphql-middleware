import { defineEventHandler, readBody, createError } from 'h3'
import type { Collector } from '../Collector'
import type { SchemaProvider } from '../SchemaProvider'

// Import handlers
import { handleListOperations } from './listOperations/handler'
import { handleGetOperation } from './getOperation/handler'
import { handleGetOperationSource } from './getOperationSource/handler'
import { handleListFragments } from './listFragments/handler'
import { handleGetFragment } from './getFragment/handler'
import { handleGetFragmentSource } from './getFragmentSource/handler'
import { handleGetFragmentsForType } from './getFragmentsForType/handler'
import { handleGetSchemaType } from './getSchemaType/handler'
import { handleGetSchemaTypeDefinition } from './getSchemaTypeDefinition/handler'
import { handleListSchemaTypes } from './listSchemaTypes/handler'
import { handleGetTypesImplementingInterface } from './getTypesImplementingInterface/handler'
import { handleGetUnionMembers } from './getUnionMembers/handler'
import { handleGetTypeUsage } from './getTypeUsage/handler'
import { handleGetFieldUsage } from './getFieldUsage/handler'
import { handleValidateDocument } from './validateDocument/handler'
import type { SchemaTypeKindFilter } from '../../runtime/server/mcp/tools/schema-list-types/types'

function requireName(body: Record<string, unknown>): string {
  const name = body.name as string | undefined
  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Missing "name" parameter in request body',
    })
  }
  return name
}

export function createMcpDevHandler(
  collector: Collector,
  schemaProvider: SchemaProvider,
) {
  return defineEventHandler(async (event) => {
    const body = await readBody<Record<string, unknown>>(event)
    const tool = body?.tool as string | undefined

    if (!tool) {
      throw createError({
        statusCode: 400,
        message: 'Missing "tool" parameter in request body',
      })
    }

    switch (tool) {
      // Operation tools
      case 'operations-list':
        return handleListOperations(collector)

      case 'operations-get':
        return handleGetOperation(collector, requireName(body))

      case 'operations-get-source':
        return handleGetOperationSource(
          collector,
          requireName(body),
          body.includeDependencies as boolean | undefined,
        )

      // Fragment tools
      case 'fragments-list':
        return handleListFragments(collector)

      case 'fragments-get':
        return handleGetFragment(collector, requireName(body))

      case 'fragments-get-source':
        return handleGetFragmentSource(
          collector,
          requireName(body),
          body.includeDependencies as boolean | undefined,
        )

      case 'fragments-list-for-type':
        return handleGetFragmentsForType(collector, requireName(body))

      // Schema tools
      case 'schema-get-type':
        return handleGetSchemaType(
          schemaProvider.getSchema(),
          requireName(body),
        )

      case 'schema-get-type-definition':
        return handleGetSchemaTypeDefinition(
          schemaProvider.getSchema(),
          requireName(body),
        )

      case 'schema-list-types':
        return handleListSchemaTypes(
          schemaProvider.getSchema(),
          body.kind as SchemaTypeKindFilter | undefined,
        )

      case 'schema-get-interface-implementors':
        return handleGetTypesImplementingInterface(
          schemaProvider.getSchema(),
          requireName(body),
        )

      case 'schema-get-union-members':
        return handleGetUnionMembers(
          schemaProvider.getSchema(),
          requireName(body),
        )

      case 'schema-get-type-usage':
        return handleGetTypeUsage(schemaProvider.getSchema(), requireName(body))

      case 'operations-get-field-usage':
        return handleGetFieldUsage(
          collector,
          schemaProvider.getSchema(),
          body.typeName as string,
          body.fieldName as string,
        )

      case 'schema-validate-document':
        return handleValidateDocument(
          schemaProvider.getSchema(),
          collector,
          body.document as string,
        )

      default:
        throw createError({
          statusCode: 400,
          message: `Unknown tool: ${tool}`,
        })
    }
  })
}
