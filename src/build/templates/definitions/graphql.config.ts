import { defineStaticTemplate } from './../defineTemplate'
import { relative, join } from 'pathe'

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

    // Also include the file containing documents provided via hooks.
    documents.push(
      './' +
        relative(
          configPath,
          join(helper.paths.moduleBuildDir, 'hook-documents.graphql'),
        ),
    )

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
import type { IGraphQLProject } from 'graphql-config'

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

const config: WithRequired<IGraphQLProject, 'schema' | 'documents'>;

export default config;
`
  },
)
