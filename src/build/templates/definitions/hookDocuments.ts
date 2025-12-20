import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Builds a GraphQL file of all hook provided documents.
 */
export default defineGeneratorTemplate(
  {
    path: 'nuxt-graphql-middleware/hook-documents.graphql',
    virtual: false,
    isFullPath: true,
    context: 'nuxt',
  },
  (_output, _helper, collector) => {
    return collector
      .getHookDocuments()
      .map((v) => {
        return `
# ${v.identifier}
${v.source}
`
      })
      .join('\n\n')
  },
  null,
)
