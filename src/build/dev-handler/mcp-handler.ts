import { defineEventHandler, readBody, createError } from 'h3'
import type { Collector } from '../Collector'
import type { SchemaProvider } from '../SchemaProvider'
import type { ModuleHelper } from '../ModuleHelper'

// Import handlers
import { handleListOperations } from './operations-list/handler'
import { handleGetOperation } from './operations-get/handler'
import { handleGetOperationSource } from './operations-get-source/handler'
import { handleListFragments } from './fragments-list/handler'
import { handleGetFragment } from './fragments-get/handler'
import { handleGetFragmentSource } from './fragments-get-source/handler'
import { handleGetFragmentsForType } from './fragments-list-for-type/handler'
import { handleGetSchemaType } from './schema-get-type/handler'
import { handleGetSchemaTypeDefinition } from './schema-get-type-definition/handler'
import { handleListSchemaTypes } from './schema-list-types/handler'
import { handleGetTypesImplementingInterface } from './schema-get-interface-implementors/handler'
import { handleGetUnionMembers } from './schema-get-union-members/handler'
import { handleGetTypeUsage } from './schema-get-type-usage/handler'
import { handleGetFieldUsage } from './operations-get-field-usage/handler'
import { handleValidateDocument } from './schema-validate-document/handler'
import { handleGetComposableExamples } from './vue-graphql-composable-example/handler'
import { handleGetServerUtilsExamples } from './nitro-graphql-server-utils-example/handler'
import { handleGetModuleConfig } from './module-get-config/handler'
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
  helper: ModuleHelper,
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
        return handleListOperations(
          collector,
          body.nameFilter as string | undefined,
        )

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
        return handleListFragments(
          collector,
          body.nameFilter as string | undefined,
        )

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

      // Composable examples tool
      case 'vue-graphql-composable-example':
        return handleGetComposableExamples(
          collector,
          schemaProvider.getSchema(),
          requireName(body),
        )

      // Server utils examples tool
      case 'nitro-graphql-server-utils-example':
        return handleGetServerUtilsExamples(
          collector,
          schemaProvider.getSchema(),
          requireName(body),
        )

      // Module config tool
      case 'module-get-config':
        return handleGetModuleConfig(helper)

      default:
        throw createError({
          statusCode: 400,
          message: `Unknown tool: ${tool}`,
        })
    }
  })
}
