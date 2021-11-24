import { GraphqlMiddlewarePlugin } from '../dist/types/templates/plugin'
import { GraphqlMiddlewareConfig } from '../dist/types/module'

declare module 'vue/types/vue' {
  interface Vue {
    readonly $graphql: GraphqlMiddlewarePlugin
  }
}

declare module 'vuex/types/index' {
  interface Store<S> {
    readonly $graphql: GraphqlMiddlewarePlugin
  }
}

declare module '@nuxt/types' {
  interface NuxtAppOptions {
    readonly $graphql: GraphqlMiddlewarePlugin
  }
  interface Context {
    readonly $graphql: GraphqlMiddlewarePlugin
  }
  interface Configuration {
    graphqlMiddleware?: GraphqlMiddlewareConfig
  }
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    graphqlMiddleware?: GraphqlMiddlewareConfig
  }
}
