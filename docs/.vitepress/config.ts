import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid({
  base: (process.env.BASE_URL as `/${string}/` | undefined) || '/',
  title: 'Nuxt GraphQL Middleware',
  lang: 'en',
  description:
    'Expose GraphQL queries and mutations as fully typed API endpoints.',
  transformHead: (ctx) => {
    let url =
      '/' + ctx.pageData.relativePath.replace('index.md', '').replace('.md', '')
    if (url === '/') {
      url = ''
    }
    return Promise.resolve([
      ...ctx.head,
      [
        'link',
        {
          rel: 'canonical',
          href: 'https://nuxt-graphql-middleware.dulnan.net' + url,
        },
      ],
    ])
  },
  themeConfig: {
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2021-present Jan Hug',
    },
    nav: [
      {
        text: 'NPM',
        link: 'https://www.npmjs.com/package/nuxt-graphql-middleware',
      },
      {
        text: 'GitHub',
        link: 'https://github.com/dulnan/nuxt-graphql-middleware',
      },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/introduction/overview' },
          { text: 'Setup', link: '/introduction/setup' },
          { text: 'Lifecycle', link: '/introduction/lifecycle' },
        ],
      },

      {
        text: 'Composables',
        items: [
          { text: 'useGraphqlQuery', link: '/composables/useGraphqlQuery' },
          {
            text: 'useAsyncGraphqlQuery',
            link: '/composables/useAsyncGraphqlQuery',
          },
          {
            text: 'useGraphqlMutation',
            link: '/composables/useGraphqlMutation',
          },
          {
            text: 'useGraphqlUploadMutation',
            link: '/composables/useGraphqlUploadMutation',
          },
          { text: 'useGraphqlState', link: '/composables/useGraphqlState' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Caching', link: '/features/caching' },
          { text: 'Auto Import', link: '/features/auto-import' },
          { text: 'Fragments', link: '/features/fragments' },
          { text: 'TypeScript', link: '/features/typescript' },
          { text: 'Debug', link: '/features/debug' },
          { text: 'Server Routes', link: '/features/server-route' },
        ],
      },
      {
        text: 'Server Utils',
        items: [
          { text: 'useGraphqlQuery', link: '/server-utils/useGraphqlQuery' },
          {
            text: 'useGraphqlMutation',
            link: '/server-utils/useGraphqlMutation',
          },
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
            text: 'Server Options',
            link: '/configuration/server-options',
          },
          {
            text: 'Client Options',
            link: '/configuration/client-options',
          },
          {
            text: 'Full Example',
            link: '/configuration/full-example',
          },
          {
            text: 'Composable',
            link: '/configuration/composable',
          },
          {
            text: 'Using Auth Headers',
            link: '/configuration/using-auth-headers',
          },
        ],
      },
    ],
  },
})
