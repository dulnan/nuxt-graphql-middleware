import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import GraphQLUpload, { FileUpload } from 'graphql-upload/GraphQLUpload.mjs'
import { GraphQLError } from 'graphql'
import data from './data.json' assert { type: 'json' }
import type { Readable } from 'stream'
import { v4 as uuidv4 } from 'uuid'

function getLanguageFromPath(path = ''): string | undefined {
  if (!path) {
    return
  }

  const matches = /\/([^/]+)/.exec(path)
  return matches?.[1]
}

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

type UploadedFile = {
  id: string
  name: string
  content: string
}

type FormSubmissionDocument = {
  name: string
  file: UploadedFile
}

type FormSubmission = {
  id: string
  firstName: string
  lastName: string
  documents: FormSubmissionDocument[]
}

let users = []
let idIncrement = 0
let files: UploadedFile[] = []
let formSubmissions: FormSubmission[] = []

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

  type DataForLayer {
    text: String
  }

  type TestClientOptions {
    language: String
    languageFromPath: String
  }

  type Query {
    users: [User!]!
    userById(id: ID!): User
    testFetchOptions: TestFetchOptions
    getRequestHeader(name: String!): String
    getError: Boolean
    getSubmissions: [FormSubmission]
    getCurrentTime: String
    dataForLayer: DataForLayer
    testClientOptions(path: String!): TestClientOptions
  }

  type UploadedFile {
    id: String!
    name: String!
    content: String!
  }

  type FormSubmissionDocument {
    name: String
    file: UploadedFile!
  }

  type FormSubmission {
    id: String!
    firstName: String
    lastName: String
    documents: [FormSubmissionDocument]
  }

  type Mutation {
    createUser(user: UserData!): User!
    deleteUser(id: Int!): Boolean
    initState: Boolean!
    triggerError: Boolean
    uploadFile(file: Upload): Boolean!
    submitForm(input: FormSubmissionInput!): Boolean!
  }

  input FormSubmissionDocumentsInput {
    name: String
    file: Upload!
  }

  input FormSubmissionInput {
    firstName: String
    lastName: String
    documents: [FormSubmissionDocumentsInput]
  }
`

function streamToString(stream: Readable): Promise<string> {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

const resolvers = {
  Query: {
    users: () => {
      return users
    },
    getCurrentTime: () => {
      return new Date()
    },
    dataForLayer: () => {
      return { text: 'This is data for the layer page.' }
    },
    getSubmissions: () => {
      return formSubmissions
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
    getRequestHeader: (_parent: any, args: any, context: any) => {
      console.log('*'.repeat(50))
      console.log(args)
      console.log(context.headers)
      console.log('*'.repeat(50))
      return context.headers[args.name]
    },
    getError: () => {
      throw new GraphQLError('Something is wrong with your data.', {
        extensions: {
          code: 'WRONG_DATA',
        },
      })
    },

    testClientOptions: (_parent: any, args: any, context: any) => {
      return {
        language: context.headers['x-nuxt-client-options-language'],
        languageFromPath: getLanguageFromPath(args.path),
      }
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

    uploadFile: async (_, { file }) => {
      const { filename, createReadStream } = await file
      console.log(`Uploading ${filename}...`)
      const stream = createReadStream()
      const content = await streamToString(stream)
      files.push({ id: uuidv4(), name: filename, content })
      return true
    },

    submitForm: async (_, { input }) => {
      const firstName = input.firstName
      const lastName = input.lastName
      const documents: FormSubmissionDocument[] = []

      for (let i = 0; i < input.documents.length; i++) {
        const doc = input.documents[i]
        const file: FileUpload = doc.file
        const name = doc.name
        const { filename, createReadStream } = await file
        const stream = createReadStream()
        const content = await streamToString(stream)

        documents.push({
          name,
          file: {
            id: uuidv4(),
            name: filename,
            content,
          },
        })
      }
      formSubmissions.push({
        id: uuidv4(),
        firstName,
        lastName,
        documents,
      })

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
      return Promise.resolve({
        headerClient,
        headerServer,
        headers: req.headers,
      })
    },
  }),
)

await new Promise((resolve) => httpServer.listen({ port: 4000 }, () => resolve))

console.log(`🚀 Server ready at http://localhost:4000/`)
