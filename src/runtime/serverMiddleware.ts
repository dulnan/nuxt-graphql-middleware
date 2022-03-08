import { resolve } from 'path'
import fs from 'fs'
import express, { Request, RequestHandler, Response } from 'express'
import { GraphQLClient } from 'graphql-request'
import { LoadNuxtConfigOptions } from '@nuxt/kit'
import { NuxtConfigSchema, NuxtOptions } from '@nuxt/schema'
import { DotenvOptions, loadConfig } from 'c12'
import { applyDefaults } from 'untyped'
import { GraphqlMiddlewareConfig } from '../module'
import runtimeConfig from '#config'

const rootDir = runtimeConfig.graphqlMiddlewareServer.nuxtRootDir as string

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
  port: any
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

const app = express()
app.use(express.json())

const clients: Map<string, GraphQLClient> = new Map()

function getClient(endpoint: string): GraphQLClient {
  if (!clients.has(endpoint)) {
    const client = new GraphQLClient(endpoint)
    clients.set(endpoint, client)
  }

  return clients.get(endpoint) as GraphQLClient
}

function getEndpoint(req: Request, config: GraphqlMiddlewareConfig) {
  if (config.server.buildEndpoint) {
    return config.server.buildEndpoint(req)
  }

  return config.graphqlServer
}

async function loadNuxtConfig(
  opts: LoadNuxtConfigOptions
): Promise<NuxtOptions> {
  const rootDir = resolve(process.cwd(), opts.rootDir || '.')

  const {
    config: nuxtConfig,
    configFile,
    layers,
  } = await loadConfig({
    cwd: rootDir,
    name: 'nuxt',
    configFile: 'nuxt.config',
    rcFile: '.nuxtrc',
    dotenv:
      typeof opts.dotenv === 'undefined' ? ({} as DotenvOptions) : opts.dotenv,
    globalRc: true,
    overrides: opts.config,
  })

  nuxtConfig.rootDir = nuxtConfig.rootDir || rootDir

  nuxtConfig._nuxtConfigFile = configFile
  nuxtConfig._nuxtConfigFiles = [configFile]
  nuxtConfig._extends = layers

  // Resolve and apply defaults
  return applyDefaults(NuxtConfigSchema, nuxtConfig) as NuxtOptions
}

/**
 * Handler for the query route.
 */
async function query(req: Request, res: Response) {
  const name = req.query.name as string

  const nuxtConfig = (await loadNuxtConfig({ rootDir })) as any // NuxtOptions
  const config = nuxtConfig.graphqlMiddleware as GraphqlMiddlewareConfig

  const queryData = fs.readFileSync(
    resolve(
      rootDir,
      runtimeConfig.graphqlMiddlewareServer.outputPath,
      'queries.all.json'
    ),
    'utf8'
  )
  const queries = new Map(JSON.parse(queryData))

  if (!name || !queries.has(name)) {
    res.status(404).send()
    return
  }

  try {
    const headers = buildHeaders(req, name, 'query', config.server)
    const variables = getVariables(req.query.variables as string)
    const query = queries.get(name) as string
    const endpoint = getEndpoint(req, config)
    const client = getClient(endpoint)
    const response = await client.rawRequest(query, variables, headers)
    if (config.server.onQueryResponse) {
      return config.server.onQueryResponse(response, req, res)
    }
    return res.json(response.data)
  } catch (e) {
    if (config.server.onQueryError) {
      return config.server.onQueryError(e, req, res)
    }
    return res.status(500).send()
  }
}

/**
 * Handler for the mutate route.
 */
async function mutate(req: Request, res: Response) {
  const name = req.query.name as string

  const nuxtConfig = (await loadNuxtConfig({ rootDir })) as any // NuxtOptions
  const config = nuxtConfig.graphqlMiddleware as GraphqlMiddlewareConfig

  const queryData = fs.readFileSync(
    resolve(
      rootDir,
      runtimeConfig.graphqlMiddlewareServer.outputPath,
      'mutations.all.json'
    ),
    'utf8'
  )
  const mutations = new Map(JSON.parse(queryData))

  if (!name || !mutations.has(name)) {
    res.status(404).send()
    return
  }
  const mutation = mutations.get(name) as string
  try {
    const headers = buildHeaders(req, name, 'mutation', config.server)
    const endpoint = getEndpoint(req, config)
    const client = getClient(endpoint)
    const response = await client.request(mutation, req.body, headers)
    if (config.server.onMutationResponse) {
      return config.server.onMutationResponse(response, req, res)
    }
    return res.json(response)
  } catch (error) {
    if (config.server.onMutationError) {
      return config.server.onMutationError(error, req, res)
    }
    return res.status(500).send()
  }
}

app.get('/query', query)
app.post('/mutate', mutate)

export default app
