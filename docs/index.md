---
layout: home

title: Nuxt GraphQL Middleware
titleTemplate:

hero:
  name: Nuxt GraphQL Middleware
  text: A GraphQL client for Nuxt
  tagline:
    Expose GraphQL queries and mutations as fully typed API endpoints. Hide your
    GraphQL server from public access and prevent bundling large queries.
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/dulnan/nuxt-graphql-middleware

features:
  - title: Reduce bundle size
    icon: ⚡
    details:
      GraphQL requests only happen on your server and responses are passed via
      Nuxt's built-in server API handler to the browser.
  - title: Full TypeScript integration
    icon: 🔍
    details:
      Types for all your queries, mutations, fragments and typed composables.
  - title: Added security
    icon: 🔒
    details:
      Easily prevent arbitrary querying on your GraphQL server by just hiding it
      from public access.
---
