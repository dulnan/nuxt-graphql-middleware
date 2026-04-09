export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit', '@nuxt/devtools'],
  nitro: {
    typescript: {
      tsConfig: {
        include: ['../src/runtime/server/mcp'],
      },
    },
  },
})
