import express, { Request, Response } from 'express'
import { GraphQLClient } from 'graphql-request'

/**
 * Try to parse the variables from the client, which are encoded as JSON.
 */
function getVariables(vars: string): any {
  try {
    const variables = JSON.parse(vars)
    return variables
  } catch (error) {
    return {}
  }
}

export interface GraphqlServerMiddlewareConfig {
  graphqlServer: string
  queries: Map<string, any>
  mutations: Map<string, any>
}

export default function createServerMiddleware(
  config: GraphqlServerMiddlewareConfig
) {
  const app = express()
  const client = new GraphQLClient(config.graphqlServer)

  /**
   * Handler for the query route.
   */
  async function query(req: Request, res: Response) {
    const name = req.query.name as string

    if (!name || !config.queries.has(name)) {
      res.status(404).send()
      return
    }

    try {
      const variables = getVariables(req.query.variables as string)
      const query = config.queries.get(name)
      const data = await client.request(query, variables)
      return res.json(data)
    } catch (e) {
      console.log(e)
      return res.status(500).send()
    }
  }

  /**
   * Handler for the mutate route.
   */
  async function mutate(req: Request, res: Response) {
    const name = req.query.name as string

    if (!name || !config.mutations.has(name)) {
      res.status(404).send()
      return
    }
    const mutation = config.mutations.get(name)
    try {
      const data = await client.request(mutation, req.body)
      return res.json(data)
    } catch (error) {
      return res.status(500).send()
    }
  }

  app.get('/query', query)
  app.post('/mutate', mutate)

  return app
}
