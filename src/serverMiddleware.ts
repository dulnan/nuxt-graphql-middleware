import express, { Request, RequestHandler, Response } from 'express'
import { GraphQLClient } from 'graphql-request'
import * as Dom from 'graphql-request/dist/types.dom'

/**
 * Try to parse the variables from the client, which are encoded as JSON.
 */
function getVariables(vars: string): any {
  try {
    return JSON.parse(vars)
  } catch (error) {
    return {}
  }
}

export interface GraphqlServerMiddlewareConfig {
  middleware?: RequestHandler
  fetchOptions?: any
  buildHeaders?: (req: Request, name: string, type: string) => any
  buildEndpoint?: (req: Request) => string
  onQueryResponse?: any
  onQueryError?: any
  onMutationResponse?: any
  onMutationError?: any

  // Options when initializing the GraphQLClient.
  // Possibility to add a custom fetch implementation or to pass in a custom http-agent.
  graphqlClientOptions?: Dom.RequestInit
}

function buildHeaders(
  req: Request,
  name: string,
  type: string,
  config?: GraphqlServerMiddlewareConfig
) {
  if (config?.buildHeaders) {
    return config.buildHeaders(req, name, type)
  }
  if (config?.fetchOptions?.headers) {
    return config.fetchOptions.headers
  }

  return {}
}

export default function createServerMiddleware(
  graphqlServer: string,
  queries: Map<string, any>,
  mutations: Map<string, any>,
  config?: GraphqlServerMiddlewareConfig
) {
  const app = express()
  app.use(express.json())

  const clients: Map<string, GraphQLClient> = new Map()

  function getClient(endpoint: string): GraphQLClient {
    if (!clients.has(endpoint)) {
      const client = new GraphQLClient(endpoint, config?.graphqlClientOptions)
      clients.set(endpoint, client)
    }

    return clients.get(endpoint) as GraphQLClient
  }

  function getEndpoint(req: Request) {
    if (config?.buildEndpoint) {
      return config.buildEndpoint(req)
    }

    return graphqlServer
  }

  if (config?.middleware) {
    app.use(config.middleware)
  }

  /**
   * Handler for the query route.
   */
  async function query(req: Request, res: Response) {
    const name = req.query.name as string

    if (!name || !queries.has(name)) {
      res.status(404).send()
      return
    }

    try {
      const headers = buildHeaders(req, name, 'query', config)
      const variables = getVariables(req.query.variables as string)
      const query = queries.get(name)
      const endpoint = getEndpoint(req)
      const client = getClient(endpoint)
      const response = await client.rawRequest(query, variables, headers)
      if (config?.onQueryResponse) {
        return config.onQueryResponse(response, req, res)
      }
      return res.json(response.data)
    } catch (e) {
      if (config?.onQueryError) {
        return config.onQueryError(e, req, res)
      }
      return res.status(500).send()
    }
  }

  /**
   * Handler for the mutate route.
   */
  async function mutate(req: Request, res: Response) {
    const name = req.query.name as string

    if (!name || !mutations.has(name)) {
      res.status(404).send()
      return
    }
    const mutation = mutations.get(name)
    try {
      const headers = buildHeaders(req, name, 'mutation', config)
      const endpoint = getEndpoint(req)
      const client = getClient(endpoint)
      const response = await client.rawRequest(mutation, req.body, headers)
      if (config?.onMutationResponse) {
        return config.onMutationResponse(response, req, res)
      }
      return res.json(response)
    } catch (error) {
      if (config?.onMutationError) {
        return config.onMutationError(error, req, res)
      }
      return res.status(500).send()
    }
  }

  app.get('/query', query)
  app.post('/mutate', mutate)

  return app
}
