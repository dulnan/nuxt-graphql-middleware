// @ts-ignore
import type Vue from 'vue'
import {} from '@nuxt/types'
import { GraphqlMiddlewareConfig } from '../module'
import { GraphqlMiddlewarePlugin } from '../templates/plugin'

// @ts-ignore
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
