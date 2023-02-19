import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { GraphQLError } from 'graphql'
import data from './data.json' assert { type: 'json' }

let users = []
let idIncrement = 0

function initState() {
  users = [...data]
  idIncrement = users.length
}

function getId() {
  idIncrement++
  return idIncrement
}

const typeDefs = `#graphql
  type User {
    id: Int!
    firstName: String!
    lastName: String!
    email: String!
    description: String
    dateOfBirth: String
  }

  input UserData {
    firstName: String!
    lastName: String!
    email: String!
    description: String
    dateOfBirth: String
  }

  type TestFetchOptions {
    headerClient: String
    headerServer: String
  }

  type Query {
    users: [User!]!
    userById(id: ID!): User
    testFetchOptions: TestFetchOptions
  }

  type Mutation {
    createUser(user: UserData!): User!
    deleteUser(id: Int!): Boolean
    initState: Boolean!
  }
`

const resolvers = {
  Query: {
    users: () => {
      return users
    },
    userById: (_: any, args: any) => {
      const id = parseInt(args.id)
      return users.find((v) => v.id === id)
    },
    testFetchOptions: (_parent: any, _args: any, context: any) => {
      return {
        headerClient: context.headerClient,
        headerServer: context.headerServer,
      }
    },
  },
  Mutation: {
    createUser: (_: any, args: any) => {
      const user = { id: getId(), ...args.user }
      users.push(user)
      return user
    },
    deleteUser: (_: any, args: any) => {
      users = users.filter((v) => v.id !== args.id)
      return true
    },
    initState: () => {
      initState()
      return true
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      requestDidStart() {
        return Promise.resolve({
          willSendResponse(requestContext) {
            const { response } = requestContext
            // Augment response with an extension, as long as the operation
            // actually executed. (The `kind` check allows you to handle
            // incremental delivery responses specially.)
            if (
              response.body.kind === 'single' &&
              'data' in response.body.singleResult
            ) {
              response.http.headers.set('set-cookie', 'foobar=my-cookie-value')
            }
            return Promise.resolve()
          },
        })
      },
    },
  ],
})

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: ({ req }) => {
    const headerClient = req.headers['x-nuxt-header-client']
    const headerServer = req.headers['x-nuxt-header-server']
    const token = req.headers.authentication || ''
    if (token !== 'server-token')
      throw new GraphQLError('you must be logged in to query this schema', {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      })
    return Promise.resolve({ headerClient, headerServer })
  },
})

initState()

console.log(`GraphQL server listening at: ${url}`)
