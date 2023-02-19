import { describe, expect, test } from 'vitest'
import { ModuleOptions } from '../../src/module'
import { generateTemplates, generateSchema } from '../../src/codegen'
import { GraphqlMiddlewareTemplate } from '../../src/runtime/settings'
const schema = `
type User {
  name: String!
  email: String!
}

type Query {
  getText: String
  translate(text: String!): String!
}

type Mutation {
  login(user: String!, password: String!): User
}
`
const documents: string[] = [
  `query getText {
    getText
  }`,
  `
  query translate($text: String!) {
    translate(text: $text)
  }
  `,
  `
  fragment user on User {
    name
    email
  }
  mutation login($user: String!, $password: String!) {
    login(user: $user, password: $password) {
      ...user
    }
  }
  `,
]

async function testTemplateWithConfig(
  config: ModuleOptions,
  template: GraphqlMiddlewareTemplate,
): Promise<string> {
  const result = await generateTemplates(documents, schema, config)
  return result.find((v) => v.filename === template)!.content!
}

describe('generateSchema', () => {
  test('Generates the correct schema.', async () => {
    const generatedSchema = await generateSchema(
      // "Hack" workaround: Passing a schema definition as the URL works here
      // because graphql-codegen allows passing either a URL or schema here. We
      // skip downloading the schema this way.
      {
        graphqlEndpoint: schema,
      },
      'schema.graphql',
      false,
    )
    expect(generatedSchema.content).toMatchSnapshot(generatedSchema.filename)
  })
})

describe('generateTemplates', () => {
  test('Generates the correct delarations.', async () => {
    const result = await generateTemplates(documents, schema, {
      serverApiPrefix: '/api/graphql_middleware',
    })

    result.forEach((v) => {
      expect(v.content, v.filename).toMatchSnapshot(v.filename)
    })
  })

  test('Generates the correct nitropack delarations.', async () => {
    const one = await testTemplateWithConfig(
      { serverApiPrefix: '/api/graphql_middleware' },
      GraphqlMiddlewareTemplate.ComposableContext,
    )
    expect(one).toContain('/api/graphql_middleware/query/getText')

    const two = await testTemplateWithConfig(
      { serverApiPrefix: '/api/custom-endpoint' },
      GraphqlMiddlewareTemplate.ComposableContext,
    )
    expect(two).toContain('/api/custom-endpoint/query/getText')
  })
})
