import { resolve } from 'node:path'

export default defineNuxtConfig({
  app: {
    head: {
      title: 'Title from a layer',
    },
  },

  alias: {
    '#test-layer': resolve(__dirname, './'),
  },
})
