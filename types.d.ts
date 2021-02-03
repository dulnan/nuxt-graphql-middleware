import Vue from 'vue'
import '@nuxt/types'
import { GraphqlMiddlewarePlugin } from './lib/types/plugin'
import { GraphqlMiddlewareConfig } from './lib/types/module'

declare module '*.vue' {
  export default Vue
}

declare module 'vue/types/vue' {
  interface Vue {
    readonly $graphql: GraphqlMiddlewarePlugin
  }
}

declare module 'vuex/types/index' {
  // @ts-ignore
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
