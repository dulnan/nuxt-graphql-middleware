import { dirname } from 'pathe'
import * as fs from 'node:fs'
import { matchImport } from './match-import'

const lineEndingRE = /\r\n|\n/

interface ResolverOptions {
  [key: string]: unknown
  basedir?: string
}

export interface InlineImportsOptions {
  resolveOptions: ResolverOptions
  /** This function is used to resolve the path to file for import */
  resolveImport: (identifier: string, options?: ResolverOptions) => string
  /** If set to true, throws error if import not found */
  throwIfImportNotFound?: boolean
  fs?: typeof import('fs')
}

interface LineWithInlinedImports {
  line: string
  match: boolean
  lineNumber: number
  filename?: string
}

function *linesWithInlinedImportsOf(
  fileContents: string,
  inlineImportsOptions: InlineImportsOptions,
  visited: Set<string>,
): Generator<LineWithInlinedImports> {
  const { resolveOptions = {}, resolveImport, fs: nodeFs = fs, throwIfImportNotFound } = inlineImportsOptions

  const { basedir } = resolveOptions

  if (typeof basedir !== 'string') {
    throw new TypeError('inlineImports requires options.resolverOptions.basedir be set')
  }

  if (!resolveImport) {
    throw new TypeError('inlineImports requires options.resolveImport be set')
  }

  let lineNumber = 0
  for (const line of fileContents.split(lineEndingRE)) {
    ++lineNumber
    const matched = matchImport(line)

    if (matched) {
      const importIdentifier = matched.importIdentifier
      let filename: string

      try {
        filename = resolveImport(importIdentifier, resolveOptions)
      } catch (err) {
        if (throwIfImportNotFound === false) {
          continue
        }

        throw err
      }

      if (visited.has(filename)) {
        continue
      } else {
        visited.add(filename)
      }

      const fragmentSource = nodeFs.readFileSync(filename, 'utf8')

      const line = inlineImportsWithLineToImports(fragmentSource, {
          resolveImport,
          resolveOptions: {
            basedir: dirname(filename),
          },
        },
        visited,
      )

      yield { line: line.inlineImports, match: true, lineNumber, filename }
    } else {
      yield { line, match: false, lineNumber }
    }
  }
}

/**
 * Returns an object containing the query/fragment with all fragments inlined, as well as the matched imports
 * (effectively, a combination of both the default `inlineImports` function, and the `lineToImports` utility)
 */
export function inlineImportsWithLineToImports(
  fileContents: string,
  options: InlineImportsOptions,
  visited = new Set<string>(),
) {
  const inlineImportsResult = []
  const lineToImports = new Map<number, { filename: string | undefined; line: string }>()

  for (const { line, match, lineNumber, filename } of linesWithInlinedImportsOf(fileContents, options, visited)) {
    inlineImportsResult.push(line)

    // We're only interested in the inlined import lines, ignore any non-matching lines
    if (match) {
      lineToImports.set(lineNumber, { filename, line })
    }
  }

  return {
    inlineImports: inlineImportsResult.join('\n'),
    lineToImports,
  }
}

export const inlineImports = (
  fileContents: string,
  options: InlineImportsOptions,
  visited = new Set<string>(),
) => inlineImportsWithLineToImports(fileContents, options, visited).inlineImports
