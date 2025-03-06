import { describe, expect, test } from 'vitest'
import { generateSchema, pluginLoader } from '../../src/codegen'

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

describe('pluginLoader', () => {
  test('Throws an error if plugin is invalid.', () => {
    expect(() => {
      pluginLoader('@graphql-codegen/this-does-not-exist')
    }).toThrowErrorMatchingInlineSnapshot(
      '[Error: graphql-codegen plugin not found: @graphql-codegen/this-does-not-exist]',
    )
  })
})
