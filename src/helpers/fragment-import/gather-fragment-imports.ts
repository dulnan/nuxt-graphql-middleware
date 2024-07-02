import { dirname } from 'pathe'
import type { InlineImportsOptions } from './inline-imports'
import { inlineImportsWithLineToImports } from './inline-imports'

interface FragmentParserGenerator {
  (source: string): Iterable<{
    name: {
      value: string
    }
    loc: {
      filename?: string
    }
  }>
}

interface GatherFragmentImportsOptions extends InlineImportsOptions {
  /** .graphql source code */
  source: string
  /** File path of the source code */
  sourceLocation: string
  /** Generator function that is passed source code. Expected to yield objects for each fragment definition */
  fragmentParserGenerator: FragmentParserGenerator
}

/**
 * Helper function to fetch and parse all the direct and transitive imports starting
 * from the source. Return object is:
 *
 * {
 *     1: {
 *         FooBar: fragment,
 *         Bar: fragment
 *     }
 * }
 *
 */
export function gatherFragmentImports(
  gatherFragmentImportsOptions: GatherFragmentImportsOptions,
): Map<number, Map<string, object>> {
  const {
    source,
    sourceLocation,
    resolveImport,
    fragmentParserGenerator,
    throwIfImportNotFound,
  } = gatherFragmentImportsOptions

  /**
   * {
   *     1: {
   *         FooBar: fragment,
   *         Bar: fragment
   *     }
   * }
   * @type {Map<number, Map<string, object>>}
   */
  const lineToFragmentDefinitions = new Map()
  const importLinesToInlinedSource = inlineImportsWithLineToImports(source, {
    resolveOptions: {
      basedir: dirname(sourceLocation),
    },
    resolveImport,
    throwIfImportNotFound,
  }).lineToImports

  for (const [
    lineNumber,
    { filename, line: source },
  ] of importLinesToInlinedSource) {
    const fragmentDefinitionsBucket =
      lineToFragmentDefinitions.get(lineNumber) || new Map()
    for (const fragment of fragmentParserGenerator(source)) {
      // Augment the FragmentDefinition by adding the resolved file path inside .loc.filename
      fragment.loc.filename = filename

      fragmentDefinitionsBucket.set(fragment.name.value, fragment)
    }
    lineToFragmentDefinitions.set(lineNumber, fragmentDefinitionsBucket)
  }

  return lineToFragmentDefinitions
}
