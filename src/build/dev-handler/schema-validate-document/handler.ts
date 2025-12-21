import { parse, Source, visit } from 'graphql'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type { ValidateDocumentResponse } from '../../../runtime/server/mcp/tools/schema-validate-document/types'
import type { Collector } from '../../Collector'

/**
 * Collects all fragment spreads (usages) and fragment definitions from a document.
 */
function collectFragmentInfo(documentSource: string): {
  usedFragments: Set<string>
  definedFragments: Set<string>
} {
  const usedFragments = new Set<string>()
  const definedFragments = new Set<string>()

  try {
    const document = parse(documentSource)

    visit(document, {
      FragmentSpread(node) {
        usedFragments.add(node.name.value)
      },
      FragmentDefinition(node) {
        definedFragments.add(node.name.value)
      },
    })
  } catch {
    // If parsing fails, return empty sets - validation will catch the error
  }

  return { usedFragments, definedFragments }
}

/**
 * Recursively collects all required fragments including their dependencies.
 */
function collectRequiredFragments(
  fragmentNames: Set<string>,
  collector: Collector,
  collected: Map<string, string> = new Map(),
): Map<string, string> {
  for (const name of fragmentNames) {
    if (collected.has(name)) {
      continue
    }

    const fragment = collector.getFragment(name)
    if (!fragment) {
      continue
    }

    // Add this fragment's source
    collected.set(name, fragment.source)

    // Recursively collect dependencies
    if (fragment.dependencies.length > 0) {
      collectRequiredFragments(
        new Set(fragment.dependencies),
        collector,
        collected,
      )
    }
  }

  return collected
}

export function handleValidateDocument(
  schema: GraphQLSchema,
  collector: Collector,
  documentSource: string,
): ValidateDocumentResponse {
  try {
    // Collect fragment usage info from the document
    const { usedFragments, definedFragments } =
      collectFragmentInfo(documentSource)

    // Find fragments that are used but not defined in the document
    const missingFragments = new Set<string>()
    for (const name of usedFragments) {
      if (!definedFragments.has(name)) {
        missingFragments.add(name)
      }
    }

    // Collect all required fragments (including transitive dependencies)
    const requiredFragments = collectRequiredFragments(
      missingFragments,
      collector,
    )

    // Append missing fragments to the document
    let fullDocument = documentSource
    if (requiredFragments.size > 0) {
      const fragmentSources = [...requiredFragments.values()].join('\n\n')
      fullDocument = `${documentSource}\n\n${fragmentSources}`
    }

    const source = new Source(fullDocument, 'input')
    const document = parse(source)
    const errors = validateGraphQlDocuments(schema, [document])

    if (errors.length === 0) {
      return {
        valid: true,
        errors: [],
      }
    }

    return {
      valid: false,
      errors: errors.map((error) => ({
        message: error.message,
        locations: error.locations?.map((loc) => ({
          line: loc.line,
          column: loc.column,
        })),
      })),
    }
  } catch (error) {
    // Handle parse errors (syntax errors)
    const message =
      error instanceof Error ? error.message : 'Unknown parsing error'

    // Try to extract location from GraphQL parse errors
    const locations =
      error &&
      typeof error === 'object' &&
      'locations' in error &&
      Array.isArray((error as { locations?: unknown[] }).locations)
        ? (
            error as { locations: Array<{ line: number; column: number }> }
          ).locations.map((loc) => ({
            line: loc.line,
            column: loc.column,
          }))
        : undefined

    return {
      valid: false,
      errors: [{ message, locations }],
    }
  }
}
