import { relative } from 'pathe'
import { defineGeneratorTemplate } from './../defineTemplate'

export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/sources' },
  (output, helper) => {
    const operations = output.getCollectedOperations()
    const srcDir = helper.paths.root
    const lines: string[] = []

    for (const operation of operations) {
      const filePath = operation.filePath.startsWith('/')
        ? relative(srcDir, operation.filePath)
        : operation.filePath
      lines.push(
        `${operation.operationType}_${operation.graphqlName}: '${filePath}',`,
      )
    }

    return `
export const operationSources = {
  ${lines.join('\n  ')}
}
`
  },
  () => {
    return `export const operationSources: Record<string, string>`
  },
)
