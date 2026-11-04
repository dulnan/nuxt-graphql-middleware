import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/devtools-ui-kit'],

  nitro: {
    output: {
      publicDir: fileURLToPath(new URL('../dist/client', import.meta.url)),
    },
  },

  app: {
    baseURL: '/__nuxt-graphql-middleware',
  },

  devtools: {
    enabled: false,
  },

  vite: {
    server: {
      ws: {
        // Instead of go through proxy, we directly connect real port of the client app
        clientPort: +(process.env.PORT || 3300),
      },
    },
  },

  compatibilityDate: '2025-03-05',
})
