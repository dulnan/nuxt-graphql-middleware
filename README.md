# Nuxt GraphQL Middleware

GraphQL in the backend, fetch in the frontend. With TypeScript support.

## Idea
When using GraphQL you have to bundle your queries in your frontend build and
send them with every request. If you have lots of queries and/or fragments,
this can increase your frontend bundle size significantly. In addition you have
to expose your entire GraphQL endpoint to the public (if you don't use persisted
queries).

This module aims to fix this by performing any GraphQL requests only on the
server side. It passes the response to the frontend via a simple JSON endpoint.
So you can have all the benefits of GraphQL but without any bloat.

It optionally generates TypeScript type files of your schema, queries and
mutations via [graphql-codegen](https://github.com/dotansimha/graphql-code-generator).

## Features
- GraphQL queries and mutations using graphql-request
- Client plugin to perform queries or mutations
- Fully flexible: Modify request headers, responses or handle errors
- HMR for queries and mutations
- TypeScript integration for schema, queries and mutations

# Setup

## Install
```bash
npm install --save nuxt-graphql-middleware
```

Minimal configuration needed:
```javascript
module.exports = {
  modules: ['nuxt-graphql-middleware'],
  graphqlMiddleware: {
    graphqlServer: 'http://example.com/graphql',
    typescript: {
      enabled: true
    },
    queries: {
      articles: '~/pages/query.articles.graphql',
    },
    plugin: {
      enabled: true
    }
  }
}
```

# Usage

## With provided plugin

### Simple query
```javascript
asyncData({ app }) {
  return app.$graphql.query('articles').then(data => {
    return { articles: data.articles }
  })
}
```

### With variables

Anything you provide in the second argument will be passed 1:1 as variables to
the GraphQL request.

```javascript
asyncData({ app }) {
  return app.$graphql.query('articles', { limit: 10 }).then(data => {
    return { articles: data.articles }
  })
}
```

### Simple mutation

Anything you provide in the second argument is used as the mutation input.
```javascript
createPost(post) {
  return app.$graphql.mutate('createPost', post).then(response => {
    if (response.hasError) {
      this.errors.push(response.error)
    }
  })
}
```

## Custom requests

You can do your own requests without using the plugin.
Query variables are passed as a JSON encoded string.

```javascript
fetch('/__api/query?name=articles')
fetch('/__api/query?name=articles&variables={"limit":10}')
fetch('/__api/mutate?name=createPost', {
  method: 'POST',
  body: JSON.stringify(post)
})
```


# Configuration

## Options

### graphqlServer: string
URL of your GraphQL server.

### endpointNamespace: string

Namespace where the server middleware is running, e.g. '/__api'.
=> http://localhost:3000/__api/query

### debug: boolean
Output additional info about available queries and mutations to the console.

### queries: Record<string, string>
Map of query name => filePath.

### mutations: Record<string, string>
Map of mutation name => filePath.

### outputPath: string
If set, the module will write the compiled queries and mutations in this
folder.

### plugin.enabled: boolean
Enable the helper plugin.

### plugin.cacheInBrowser: boolean
Cache requests in the plugin (on client side / browser).

This enables a simple cache (using a Map) in the browser, which will cache up
to 30 queries. This is useful to provide near instant rendering when going back
and forth in the browser history.

Queries are cached based on their full URL (incl. query string).

### plugin.cacheInServer: boolean
Same as cacheInBrowser, but the queries are also cached server side.
*Note:* There is no way to purge this cache! Only use this if you're fine with
returning potentially outdated responses.

### server.middleware: (req: Request, res: Response, next: NextFunction) => any
An express middleware. Can be used for example to add an authentication or CORS
check.

```javascript
function(req, res, next) {
  if (isLoggedIn(req.headers.cookie)) {
    return next()
  }
  res.status(403).send()
}
```

### server.fetchOptions: Record<string, any>
Object of options passed to the fetch request to GraphQL.

### server.buildHeaders: (req: Request, name: string, type: string) => Record<string, any>
Called before every request

```javascript
function (req, name, type) {
  if (isLoggedIn(req.headers.cookie)) {
    if (type === 'mutation') {
      return {
        Authorization: 'Basic ' + process.env.BASIC_AUTH_WRITE
      }
    }
  }
}
```

### server.buildEndpoint: (req: Request) => string
Called before every request. This allows you to set the URL for the GraphQL
server.

This is useful if you have multiple endpoints, for example with a language
prefix.

```javascript
function (req) {
  const language = getLanguageFromHeaders(req.headers)
  return `https://example.com/${language}/graphql`
}
```


### server.onQueryResponse: (response: GraphQLResponse, req: Request, res: Response) => any
Handle GraphQL server query responses before they are sent to the client.

```javascript
function(response, req, res) {
  return res.json({
    data: response.data,
    time: Date.now()
  })
}
```

### server.onQueryError: (error: ClientError, req: Request, res: Response) => any
Handle GraphQL server query errors before they are sent to the client.

### server.onMutationResponse: (response: GraphQLResponse, req: Request, res: Response) => any
Handle GraphQL server mutation responses before they are sent to the client.

### server.onMutationError: (error: ClientError, req: Request, res: Response) => any
Handle GraphQL server mutation errors before they are sent to the client.

### typescript.enabled: boolean
Enable TypeScript integration.

### typescript.schemaOutputPath: string
Folder where the downloaded schema.graphql file is saved.

### typescript.skipSchemaDownload: boolean
Don't download the schema. Use this for example if you commit the schema in
your repository, so that it's available during deployment.

### typescript.schemaOptions: [UrlSchemaOptions](https://github.com/dotansimha/graphql-code-generator/blob/master/packages/utils/plugins-helpers/src/types.ts#L74)
Options passed to graphql-codegen.

### typescript.typesOutputPath: string
Folder where the generated graphql-schema.d.ts and graphql-operations.d.ts
files are saved.

## Extend $graphql plugin

If you want to add custom headers to the request made by `$graphql` to the
middleware, create a plugin and add a `beforeRequest` method:

```javascript
export default (pluginContext) => {
  pluginContext.$graphql.beforeRequest((ctx, options) => {
    options.headers['accept-language'] = ctx.route.params.lang
    return options
  })
}
```

You have access to the context via the first parameter. The second parameter
provides the fetch options, which you have to return.

### Integrate with nuxt-auth

Add a `beforeRequest` method in a custom plugin:

```javascript
export default (pluginContext) => {
  pluginContext.$graphql.beforeRequest((ctx, options) => {
    if (ctx.$auth.loggedIn) {
      options.headers['authorization'] = ctx.$auth.strategy.token.get()
    }
    return options
  })
}
```

Add a `server.buildHeaders` method, where you get the authorization header from
the client request and pass it on to the server request.

```javascript
buildHeaders(req, name, type) {
  const auth = req.headers.authorization
  if (auth) {
    return {
      Authorization: auth,
    }
  }

  return {}
}
```

## Full working example

```javascript
module.exports = {
  modules: ['nuxt-graphql-middleware'],

  graphqlMiddleware: {
    graphqlServer: 'http://example.com/graphql'
    endpointNamespace: '/__api'
    debug: true
    queries: {
      route: '~/pages/query.route.graphql',
      articles: '~/pages/articles/query.articles.graphql',
      footer: '~/components/Footer/query.footer.graphql',
    },
    mutations: {
      createPost: '~/components/Comment/mutation.createPost.graphql'
    },
    outputPath: '~/graphql_tmp'
    plugin: {
      enabled: true,
      cacheInBrowser: true,
      cacheInServer: false,
    },
    typescript: {
      enabled: true,
      schemaOutputPath: '~/schema',
      typesOutputPath: '~/types',
      schemaOptions: {
        headers: {
          Authorization: 'Basic ' + process.env.BASIC_AUTH
        }
      }
    },
    server: {
      middleware: function(req, res, next) {
        if (isLoggedIn(req.headers.cookie)) {
          return next()
        }
        res.status(403).send()
      },
      fetchOptions: {
        headers: {
          Authorization: 'Basic ' + process.env.BASIC_AUTH
        }
      },
      buildHeaders: function (req, name, type) {
        if (isLoggedIn(req.headers.cookie)) {
          if (type === 'mutation') {
            return {
              Authorization: 'Basic ' + process.env.BASIC_AUTH_WRITE
            }
          }
        }
      },
      onQueryResponse: function(response, req, res) {
        return res.json({
          data: response.data,
          time: Date.now()
        })
      },
      onQueryError: function(error, req, res) {
        return res.status(500).send()
      },
      onMutationResponse: function(response, req, res) {
        return res.json({
          data: response.data,
          time: Date.now()
        })
      }
      onMutationError: function(error, req, res) {
        return res.status(500).send()
      }
    }
  }
}
```

# TODO
- Pass port to client plugin
