import type { GeneratorOutputOperation } from 'graphql-typescript-deluxe'
import { relative } from 'pathe'

export default function (
  operations: readonly GeneratorOutputOperation[],
  srcDir: string,
) {
  const lines: string[] = []

  for (const operation of operations) {
    const filePath = relative(srcDir, operation.filePath)
    lines.push(
      `${operation.operationType}_${operation.graphqlName}: '${filePath}',`,
    )
  }

  return `
export const operationSources = {
  ${lines.join('\n  ')}
}
`
}
