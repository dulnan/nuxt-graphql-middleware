import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'
import { GraphQLError } from 'graphql'
import data from './data.json' assert { type: 'json' }

const BASIC_LOGGING: any = {
  requestDidStart(requestContext) {
    console.log('request started')
    console.log(requestContext.request.query)
    console.log(requestContext.request.variables)
    return {
      didEncounterErrors(requestContext) {
        console.log(
          'an error happened in response to query ' +
            requestContext.request.query,
        )
        console.log(requestContext.errors)
      },
    }
  },

  willSendResponse(requestContext) {
    console.log('response sent', requestContext.response)
  },
}

let users = []
let idIncrement = 0
let files = []
let formSubmissions = []

function initState() {
  users = [...data]
  idIncrement = users.length
  files = []
  formSubmissions = []
}

initState()

function getId() {
  idIncrement++
  return idIncrement
}

const typeDefs = `#graphql
  scalar Upload
  type User {
    id: Int!
    firstName: String!
    lastName: String!
    email: String!
    description: String
    dateOfBirth: String
    friends: [User]
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
    getError: Boolean
  }

  type Mutation {
    createUser(user: UserData!): User!
    deleteUser(id: Int!): Boolean
    initState: Boolean!
    triggerError: Boolean
    uploadFile(id: String!, file: Upload!): File!
    submitForm(elements: [FormElement]): Boolean!
  }

  input FormElement {
    name: String
    file: Upload!
  }

  type File {
    id: String!
    filename: String!
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
    getError: () => {
      throw new GraphQLError('Something is wrong with your data.', {
        extensions: {
          code: 'WRONG_DATA',
        },
      })
    },
  },
  User: {
    friends: () => {
      return []
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

    triggerError: () => {
      throw new GraphQLError('Something is wrong with your data.', {
        extensions: {
          code: 'WRONG_DATA',
        },
      })
    },

    uploadFile: async (_, { id, file }) => {
      const { filename, createReadStream } = await file
      console.log(`Uploading ${filename}...`)
      const stream = createReadStream()
      // Promisify the stream and store the file, then…
      const newImage = { id, filename }
      files.push(newImage)
      return newImage
    },

    submitForm: async (_, { elements }) => {
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        const file = element.file
        const { filename, createReadStream } = await file
        console.log(`Uploading ${filename}...`)
        const stream = createReadStream()
        // Promisify the stream and store the file, then…
        formSubmissions.push({ name: element.name })
      }

      return true
    },
  },

  Upload: GraphQLUpload,
}

const app = express()
const httpServer = http.createServer(app)

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
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
    BASIC_LOGGING,
  ],
})
await server.start()

app.use(
  '/',
  cors(),
  bodyParser.json(),
  graphqlUploadExpress(),
  expressMiddleware(server, {
    context: async ({ req }) => {
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
  }),
)

await new Promise((resolve) => httpServer.listen({ port: 4000 }, () => resolve))

console.log(`🚀 Server ready at http://localhost:4000/`)
