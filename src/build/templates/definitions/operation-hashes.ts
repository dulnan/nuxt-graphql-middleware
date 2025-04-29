import { defineGeneratorTemplate } from './../defineTemplate'
import { hash } from 'ohash'

/**
 * Exports a single opject containing the compiled queries and mutations.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/operation-hashes', virtual: true },
  (output, helper) => {
    // In dev mode we don't need to generate the operation hashes.
    if (helper.isDev) {
      return `export const operationHashes = {}`
    }

    const fragmentHashMap: Record<string, string> = {}

    const generatedCode = output.getGeneratedCode()
    generatedCode.forEach((code) => {
      if (code.type === 'fragment') {
        const fragmentHash = hash(code.source)
        if (code.graphqlName) {
          fragmentHashMap[code.graphqlName] = fragmentHash
        }
      }
    })

    const lines: string[] = []

    generatedCode.forEach((code) => {
      if (code.type === 'operation' && code.graphqlName && code.source) {
        const source = code.source
        const fragments = code
          .getGraphQLFragmentDependencies()
          .map((fragmentName) => {
            return fragmentHashMap[fragmentName]
          })
          .join('')
        const sourceHash = hash(source + fragments)
        lines.push(`"${code.graphqlName}": "${sourceHash.substring(0, 10)}"`)
      }
    })

    return `export const operationHashes = {
  ${lines.sort().join(',\n  ')}
}`
  },
  () => {
    return `
declare module '#nuxt-graphql-middleware/operation-hashes' {
  export const operationHashes: Record<string, string>;
}
`
  },
)
