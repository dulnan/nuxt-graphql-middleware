import { defineGeneratorTemplate } from './../defineTemplate'
import { relative } from 'pathe'

/**
 * Builds a GraphQL file of all hook provided documents.
 */
export default defineGeneratorTemplate(
  {
    path: 'nuxt-graphql-middleware/hook-files',
    virtual: false,
  },
  (_output, helper, collector) => {
    const configPath = helper.resolvers.root.resolve(
      (helper.options.graphqlConfigFilePath || '').replace(
        '/graphql.config.ts',
        '',
      ),
    )
    const files = collector.getHookFiles().map((filePath) => {
      return './' + relative(configPath, filePath)
    })

    return `export const hookFiles = ${JSON.stringify(files, null, 2)}`
  },
  null,
)
