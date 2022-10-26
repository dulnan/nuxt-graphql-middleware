declare module '@nuxt/schema' {
  interface RuntimeConfig {
    graphqlMiddleware: {
      rootDir: string
    }
    public: {
      'nuxt-graphql-middleware': {
        serverApiPrefix: string
      }
    }
  }
}

export {}
