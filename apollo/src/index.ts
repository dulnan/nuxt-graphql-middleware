import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import data from './data.json' assert { type: 'json' }

let users = [...data]
let idIncrement = users.length

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

  type Query {
    users: [User!]!
    userById(id: ID!): User
  }

  type Mutation {
    createUser(user: UserData!): User!
    deleteUser(id: Int!): Boolean
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
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

const { url } = await startStandaloneServer(server, { listen: { port: 4000 } })

console.log(`GraphQL server listening at: ${url}`)
