import { defineStaticTemplate } from './../defineTemplate'
import { relative } from 'pathe'

export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/graphql.config' },
  (helper) => {
    const patterns = helper.options.autoImportPatterns || []
    const configPath = helper.resolvers.root.resolve(
      (helper.options.graphqlConfigFilePath || '').replace(
        '/graphql.config.ts',
        '',
      ),
    )
    const schemaPath = './' + relative(configPath, helper.paths.schema)
    const documents = patterns
      .filter((v) => !v.includes('!'))
      .map((pattern) => {
        return (
          './' + relative(configPath, helper.resolvers.root.resolve(pattern))
        )
      })
    return `const schema = ${JSON.stringify(schemaPath)}

const documents = ${JSON.stringify(documents, null, 2)};

const config = {
  schema,
  documents,
}

export default config
`
  },
  () => {
    return `
import type { IGraphQLConfig } from 'graphql-config'

const config: IGraphQLConfig

export default config
`
  },
)
