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
import data from './data.json' with { type: 'json' }
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

// Content types for CMS-style interface demo
type ContentBase = {
  id: string
  title: string
  slug: string
  publishedAt: string | null
  authorId: number
}

type Article = ContentBase & {
  __typename: 'Article'
  excerpt: string
  body: string
  category: string
}

type BlogPost = ContentBase & {
  __typename: 'BlogPost'
  content: string
  tags: string[]
}

type Page = ContentBase & {
  __typename: 'Page'
  content: string
  template: string
}

type Content = Article | BlogPost | Page

let users = []
let idIncrement = 0
let files: UploadedFile[] = []
let formSubmissions: FormSubmission[] = []

// Dummy content data
const articles: Article[] = [
  {
    __typename: 'Article',
    id: 'article-1',
    title: 'Understanding GraphQL Interfaces',
    slug: 'understanding-graphql-interfaces',
    publishedAt: '2024-01-15T10:00:00Z',
    authorId: 1,
    excerpt: 'Learn how interfaces work in GraphQL schemas.',
    body: 'GraphQL interfaces are an abstract type that includes a set of fields that a type must include to implement the interface...',
    category: 'Technology',
  },
  {
    __typename: 'Article',
    id: 'article-2',
    title: 'Building Modern Web Applications',
    slug: 'building-modern-web-applications',
    publishedAt: '2024-02-20T14:30:00Z',
    authorId: 2,
    excerpt: 'A comprehensive guide to modern web development.',
    body: 'Modern web applications require a combination of frontend frameworks, backend APIs, and proper architecture...',
    category: 'Development',
  },
]

const blogPosts: BlogPost[] = [
  {
    __typename: 'BlogPost',
    id: 'blog-1',
    title: 'My Journey with Nuxt',
    slug: 'my-journey-with-nuxt',
    publishedAt: '2024-03-01T09:00:00Z',
    authorId: 1,
    content:
      'I started using Nuxt about two years ago and it has transformed how I build Vue applications...',
    tags: ['nuxt', 'vue', 'javascript'],
  },
  {
    __typename: 'BlogPost',
    id: 'blog-2',
    title: 'Tips for Better Code Reviews',
    slug: 'tips-for-better-code-reviews',
    publishedAt: null, // Draft
    authorId: 3,
    content:
      'Code reviews are essential for maintaining code quality. Here are my top tips...',
    tags: ['best-practices', 'teamwork'],
  },
]

const pages: Page[] = [
  {
    __typename: 'Page',
    id: 'page-1',
    title: 'About Us',
    slug: 'about',
    publishedAt: '2023-01-01T00:00:00Z',
    authorId: 1,
    content: 'We are a team of passionate developers building great software.',
    template: 'default',
  },
  {
    __typename: 'Page',
    id: 'page-2',
    title: 'Contact',
    slug: 'contact',
    publishedAt: '2023-01-01T00:00:00Z',
    authorId: 2,
    content: 'Get in touch with us at contact@example.com',
    template: 'contact',
  },
]

function getAllContent(): Content[] {
  return [...articles, ...blogPosts, ...pages]
}

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
  enum MeansOfContact {
    phone
    email
  }

  """
  Base interface for all content types in the CMS.
  """
  interface Content {
    """
    Unique identifier for the content.
    """
    id: ID!

    """
    The title of the content.
    """
    title: String!

    """
    URL-friendly slug.
    """
    slug: String!

    """
    When the content was published. Null if draft.
    """
    publishedAt: String

    """
    The author of the content.
    """
    author: User
  }

  """
  A long-form article with excerpt and category.
  """
  type Article implements Content {
    id: ID!
    title: String!
    slug: String!
    publishedAt: String
    author: User

    """
    Short excerpt for previews.
    """
    excerpt: String!

    """
    Full article body.
    """
    body: String!

    """
    Article category.
    """
    category: String!
  }

  """
  A blog post with tags.
  """
  type BlogPost implements Content {
    id: ID!
    title: String!
    slug: String!
    publishedAt: String
    author: User

    """
    The blog post content.
    """
    content: String!

    """
    Tags for categorization.
    """
    tags: [String!]!
  }

  """
  A static page with a template.
  """
  type Page implements Content {
    id: ID!
    title: String!
    slug: String!
    publishedAt: String
    author: User

    """
    The page content.
    """
    content: String!

    """
    Template to use for rendering.
    """
    template: String!
  }

  """
  Union type for search results.
  """
  union SearchResult = User | Article | BlogPost | Page

  type User {
    """
    The ID of the user.
    """
    id: Int!

    """
    First name of the user.
    """
    firstName: String!

    """
    Last name of the user.
    """
    lastName: String!

    """
    Email address.
    """
    email: String!

    """
    Description.
    """
    description: String

    """
    Date of birth as YYYY-MM-DD.
    """
    dateOfBirth: String

    """
    All their friends.
    """
    friends: [User]

    """
    How the user likes to be contacted.
    """
    meansOfContact: MeansOfContact

    """
    Number of articles written by the user.
    """
    articleCount: Int!

    triggerError: Boolean
  }

  type UsersResult {
    """
    List of users for the current page.
    """
    users: [User!]!

    """
    Total number of users available.
    """
    totalCount: Int!

    """
    Current page offset.
    """
    offset: Int!

    """
    Current page limit.
    """
    limit: Int!
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
    foobar: String
    """
    Get all users.
    """
    users: [User!]!

    """
    Get users with pagination metadata.
    """
    usersPaginated(limit: Int, offset: Int): UsersResult!

    """
    Load a user by ID.
    """
    userById(id: ID!): User

    """
    Test the fetch options.
    """
    testFetchOptions: TestFetchOptions

    """
    Returns the value of a request header.
    """
    getRequestHeader(name: String!): String

    """
    Produce a GraphQL error.
    """
    getError: Boolean

    """
    Get all submissions.
    """
    getSubmissions: [FormSubmission]

    """
    Get the current time.
    """
    getCurrentTime: String

    getText(text: String!): String!

    dataForLayer: DataForLayer

    """
    Test the client options.
    """
    testClientOptions(path: String!): TestClientOptions

    """
    Returns the same value.
    """
    returnSameValue(value: Int!, vary: String): Int!

    """
    Returns a random number.
    """
    returnRandomNumber: Int!

    """
    Get all content items (articles, blog posts, pages).
    """
    allContent: [Content!]!

    """
    Get all articles.
    """
    articles: [Article!]!

    """
    Get all blog posts.
    """
    blogPosts: [BlogPost!]!

    """
    Get all pages.
    """
    pages: [Page!]!

    """
    Get content by slug.
    """
    contentBySlug(slug: String!): Content

    """
    Search across all content types and users.
    """
    search(query: String!): [SearchResult!]!
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
    usersPaginated: (_: any, args: any) => {
      console.log('UsersPaginated query called with args:', args)
      let result = [...users] // Create a copy to avoid mutating the original array
      const totalCount = users.length
      const offset = args.offset || 0
      const limit = args.limit || result.length

      // Apply offset first, then limit
      if (offset > 0) {
        result = result.slice(offset)
      }
      if (limit > 0) {
        result = result.slice(0, limit)
      }

      console.log(
        `Returning ${result.length} users (offset: ${offset}, limit: ${limit}, total: ${totalCount})`,
      )

      return {
        users: result,
        totalCount: totalCount,
        offset: offset,
        limit: limit,
      }
    },
    getCurrentTime: () => {
      return new Date()
    },
    getText: (_: any, args: any) => {
      return args.text
    },
    dataForLayer: () => {
      return { text: 'This is data for the layer page.' }
    },
    getSubmissions: () => {
      return formSubmissions
    },
    foobar: () => {
      return 'test'
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
    returnSameValue: (_parent: any, args: any, context: any) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(args.value)
        }, 500)
      })
    },
    returnRandomNumber: () => {
      return Math.round(Math.random() * 100000000)
    },

    // Content queries
    allContent: () => {
      return getAllContent()
    },
    articles: () => {
      return articles
    },
    blogPosts: () => {
      return blogPosts
    },
    pages: () => {
      return pages
    },
    contentBySlug: (_: any, args: { slug: string }) => {
      return getAllContent().find((c) => c.slug === args.slug) || null
    },
    search: (_: any, args: { query: string }) => {
      const q = args.query.toLowerCase()
      const results: (Content | (typeof users)[0])[] = []

      // Search in content
      for (const content of getAllContent()) {
        if (
          content.title.toLowerCase().includes(q) ||
          content.slug.toLowerCase().includes(q)
        ) {
          results.push(content)
        }
      }

      // Search in users
      for (const user of users) {
        if (
          user.firstName.toLowerCase().includes(q) ||
          user.lastName.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
        ) {
          results.push(user)
        }
      }

      return results
    },
  },

  // Interface type resolver
  Content: {
    __resolveType(obj: Content) {
      return obj.__typename
    },
    author: (parent: Content) => {
      return users.find((u) => u.id === parent.authorId) || null
    },
  },

  // Union type resolver
  SearchResult: {
    __resolveType(obj: any) {
      if (obj.__typename) {
        return obj.__typename
      }
      // Users don't have __typename, but have email
      if (obj.email) {
        return 'User'
      }
      return null
    },
  },

  // Type-specific author resolvers
  Article: {
    author: (parent: Article) => {
      return users.find((u) => u.id === parent.authorId) || null
    },
  },
  BlogPost: {
    author: (parent: BlogPost) => {
      return users.find((u) => u.id === parent.authorId) || null
    },
  },
  Page: {
    author: (parent: Page) => {
      return users.find((u) => u.id === parent.authorId) || null
    },
  },

  User: {
    friends: () => {
      return []
    },
    articleCount: (parent: { id: number }) => {
      return articles.filter((article) => article.authorId === parent.id).length
    },
    triggerError: () => {
      throw new GraphQLError(
        'An error triggered inside the triggerError field resolver.',
        {
          extensions: {
            code: 'USER_ERROR',
          },
        },
      )
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
