import type { ModuleHelper } from '../ModuleHelper'
import { relative } from 'pathe'

export default function (helper: ModuleHelper) {
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
      return './' + relative(configPath, helper.resolvers.root.resolve(pattern))
    })
  return `
import type { IGraphQLConfig } from 'graphql-config'

const schema = ${JSON.stringify(schemaPath)}

const documents: string[] = ${JSON.stringify(documents, null, 2)};

const config: IGraphQLConfig = {
  schema,
  documents,
}

export default config
`
}
