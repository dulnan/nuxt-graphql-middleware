import { defineConfig } from 'vitepress'

export default defineConfig({
  base: (process.env.BASE_URL as `/${string}/` | undefined) || '/',
  title: 'Nuxt GraphQL Middleware',
  description: '',
  locales: {
    '/': {
      lang: 'en-US',
    },
  },
  themeConfig: {
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/introduction/overview' },
          { text: 'Setup', link: '/introduction/setup' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Server Routes', link: '/features/server-route' },
          { text: 'Auto Import', link: '/features/auto-import' },
          { text: 'Fragments', link: '/features/fragments' },
          { text: 'Composables', link: '/features/composables' },
          { text: 'TypeScript', link: '/features/typescript' },
        ],
      },
      {
        text: 'Configuration',
        items: [
          {
            text: 'Module',
            link: '/configuration/module',
          },
          {
            text: 'Full Example',
            link: '/configuration/full-example',
          },
          {
            text: 'Composable',
            link: '/configuration/composable',
          },
        ],
      },
    ],
  },
})
