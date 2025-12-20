export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit'],
  nitro: {
    typescript: {
      tsConfig: {
        include: ['../src/runtime/server/mcp'],
      },
    },
  },
})
