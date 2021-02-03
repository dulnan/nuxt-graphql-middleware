# Nuxt GraphQL Middleware

GraphQL in the backend, fetch in the frontend.

## Idea
When using GraphQL you have to bundle your queries in your frontend build and
send them with every request. If you have lots of queries and/or fragments,
this can increase your frontend bundle size significantly. In addition you have
to expose your entire GraphQL endpoint to the public (or use persisted
queries).

This module aims to fix this by performing any GraphQL requests only on the
server side. It passes the response to the frontend via a simple JSON endpoint.
So you can have all the benefits of GraphQL but without any bloat.

## Features
- GraphQL queries and mutations using graphql-request
- Client plugin to perform queries or mutations
- Fully flexible: Modify request headers, responses or handle errors
- HMR for queries and mutations

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
    queries: {
      articles: '~/pages/query.articles.graphql',
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

Anything you provide in the second argument is used as mutation input.
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
If set, the module will write the compiled queries and mutations in this folder.

### clientPlugin.cacheInBrowser: boolean
Cache requests in the client plugin.

This enables a simple cache (using a Map) in the browser, which will cache up
to 30 queries. This is useful to provide near instant rendering when going back
and forth in the browser history.

Queries are cached based on their full URL (incl. query string).

### server.middleware: (req: Request, res: Response, next: NextFunction) => any
An express middleware. Can be used for example to add an authentication or CORS check.

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
    clientPlugin: {
      cacheInBrowser: true
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
