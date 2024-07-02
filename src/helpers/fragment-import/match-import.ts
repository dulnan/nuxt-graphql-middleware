const importSyntaxRE = /^#import (?:'([^']*)'|"([^"]*)")/

export interface ImportMatch {
  importIdentifier: string
}

export const matchImport = (value = ''): ImportMatch | undefined => {
  if (!value) {
    return undefined
  }

  if (value.indexOf('#import') !== 0) {
    // Check if the first line is an import
    return undefined
  }

  const matched = value.match(importSyntaxRE)

  if (matched === null) {
    return undefined
  }

  const importIdentifierMatch = value.match(importSyntaxRE) || []

  const importIdentifier = importIdentifierMatch[1] ?? importIdentifierMatch[2]

  if (importIdentifier === undefined) {
    return undefined
  }

  return { importIdentifier }
}
