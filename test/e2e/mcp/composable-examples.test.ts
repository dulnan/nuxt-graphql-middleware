import { describe, it, expect, afterAll } from 'vitest'
import { setupMcpTests, ensureMcpClient, cleanupMcpTests } from './setup'

describe('MCP Vue GraphQL Composable Examples Tool', async () => {
  await setupMcpTests()

  afterAll(async () => {
    await cleanupMcpTests()
  })

  describe('vue-graphql-composable-example', () => {
    it('should generate examples for a query without variables', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'vue-graphql-composable-example',
        arguments: { operationName: 'users' },
      })

      expect(result).toBeDefined()
      expect(result.structuredContent).toBeDefined()

      const structured = result.structuredContent as {
        examples: Array<{ code: string; description: string }>
        imports: Array<{ typeName: string; description: string }>
        error?: string
      }

      expect(structured.error).toBeUndefined()
      expect(structured.examples).toBeInstanceOf(Array)
      expect(structured.examples.length).toBeGreaterThan(0)

      // Snapshot the generated examples
      expect(structured.examples).toMatchInlineSnapshot(`
        [
          {
            "code": "const { data } = await useAsyncGraphqlQuery(
          'users',
          null,
          // Same options as useAsyncData.
          {
            transform: function (graphqlResponse) {
              // // The type of "graphqlResponse.data" is UsersQuery. Prepare the data here before returning it.
              return graphqlResponse.data
            },
          },
        )

        // data is reactive, data.value is UsersQuery | undefined
        console.log(data.value)",
            "description": "useAsyncGraphqlQuery: SSR-compatible, reactive data fetching. Must be called at the root of a component setup or inside another composable. Same limitations as useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useAsyncGraphqlQuery.html",
          },
          {
            "code": "const response = await useGraphqlQuery('users')

        // response.data is UsersQuery | undefined
        console.log(response.data)",
            "description": "useGraphqlQuery: Returns a promise. Can be used anywhere - in components, plugins, other composables, event handlers, or inside useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlQuery.html",
          },
        ]
      `)

      // Snapshot the imports (no variables, so only response type)
      expect(structured.imports).toMatchInlineSnapshot(`
        [
          {
            "description": "Response type for the operation",
            "typeName": "UsersQuery",
          },
        ]
      `)
    })

    it('should generate examples for a query with variables using reactive computed pattern', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'vue-graphql-composable-example',
        arguments: { operationName: 'userById' },
      })

      const structured = result.structuredContent as {
        examples: Array<{ code: string; description: string }>
        imports: Array<{ typeName: string; description: string }>
        error?: string
      }

      expect(structured.error).toBeUndefined()
      expect(structured.examples).toBeInstanceOf(Array)
      expect(structured.examples.length).toBeGreaterThan(0)

      // Snapshot the generated examples
      expect(structured.examples).toMatchInlineSnapshot(`
        [
          {
            "code": "import type { UserByIdQueryVariables } from '#graphql-operations'

        const variables = computed<UserByIdQueryVariables>(() => {
          return {
            id: 'id_id',
          }
        })

        const { data } = await useAsyncGraphqlQuery(
          'userById',
          variables,
          // Same options as useAsyncData.
          {
            transform: function (graphqlResponse) {
              // // The type of "graphqlResponse.data" is UserByIdQuery. Prepare the data here before returning it.
              return graphqlResponse.data
            },
          },
        )

        // data is reactive, data.value is UserByIdQuery | undefined
        console.log(data.value)",
            "description": "useAsyncGraphqlQuery: SSR-compatible, reactive data fetching. Must be called at the root of a component setup or inside another composable. Same limitations as useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useAsyncGraphqlQuery.html",
          },
          {
            "code": "const response = await useGraphqlQuery('userById', { id: 'id_id' })

        // response.data is UserByIdQuery | undefined
        console.log(response.data)",
            "description": "useGraphqlQuery: Returns a promise. Can be used anywhere - in components, plugins, other composables, event handlers, or inside useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlQuery.html",
          },
        ]
      `)

      // Snapshot the imports (has ID variable which is scalar, so only response + variables types)
      expect(structured.imports).toMatchInlineSnapshot(`
        [
          {
            "description": "Response type for the operation",
            "typeName": "UserByIdQuery",
          },
          {
            "description": "Variables type for the operation",
            "typeName": "UserByIdQueryVariables",
          },
        ]
      `)
    })

    it('should generate examples for a mutation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'vue-graphql-composable-example',
        arguments: { operationName: 'addUser' },
      })

      const structured = result.structuredContent as {
        examples: Array<{ code: string; description: string }>
        imports: Array<{ typeName: string; description: string }>
        error?: string
      }

      expect(structured.error).toBeUndefined()
      expect(structured.examples).toBeInstanceOf(Array)
      expect(structured.examples.length).toBeGreaterThan(0)

      // Snapshot the generated examples
      expect(structured.examples).toMatchInlineSnapshot(`
        [
          {
            "code": "const response = await useGraphqlMutation('addUser', { user: { /* placeholder for: UserData */ } })

        // response.data is AddUserMutation | undefined
        console.log(response.data)",
            "description": "useGraphqlMutation: Returns a promise. Can be used anywhere - in components, plugins, other composables, or event handlers.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlMutation.html",
          },
        ]
      `)

      // Snapshot the imports (has UserData input type)
      expect(structured.imports).toMatchInlineSnapshot(`
        [
          {
            "description": "Response type for the operation",
            "typeName": "AddUserMutation",
          },
          {
            "description": "Variables type for the operation",
            "typeName": "AddUserMutationVariables",
          },
          {
            "description": "Input object type used in variables",
            "typeName": "UserData",
          },
        ]
      `)
    })

    it('should return error for non-existent operation', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      const result = await client.callTool({
        name: 'vue-graphql-composable-example',
        arguments: { operationName: 'nonExistentOperation' },
      })

      const structured = result.structuredContent as {
        examples?: Array<{ code: string; description: string }>
        error?: string
      }

      expect(structured.error).toBeDefined()
      expect(structured.error).toContain('nonExistentOperation')
      expect(structured.error).toContain('not found')
    })

    it('should include mock values for different variable types', async () => {
      const client = await ensureMcpClient()
      if (!client) {
        return
      }

      // usersPaginated has Int variables (limit, offset)
      const result = await client.callTool({
        name: 'vue-graphql-composable-example',
        arguments: { operationName: 'usersPaginated' },
      })

      const structured = result.structuredContent as {
        examples: Array<{ code: string; description: string }>
        imports: Array<{ typeName: string; description: string }>
        error?: string
      }

      expect(structured.error).toBeUndefined()
      expect(structured.examples).toBeInstanceOf(Array)

      // Snapshot the generated examples with Int variables
      expect(structured.examples).toMatchInlineSnapshot(`
        [
          {
            "code": "import type { UsersPaginatedQueryVariables } from '#graphql-operations'

        const variables = computed<UsersPaginatedQueryVariables>(() => {
          return {
            limit: 1,
            offset: 1,
          }
        })

        const { data } = await useAsyncGraphqlQuery(
          'usersPaginated',
          variables,
          // Same options as useAsyncData.
          {
            transform: function (graphqlResponse) {
              // // The type of "graphqlResponse.data" is UsersPaginatedQuery. Prepare the data here before returning it.
              return graphqlResponse.data
            },
          },
        )

        // data is reactive, data.value is UsersPaginatedQuery | undefined
        console.log(data.value)",
            "description": "useAsyncGraphqlQuery: SSR-compatible, reactive data fetching. Must be called at the root of a component setup or inside another composable. Same limitations as useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useAsyncGraphqlQuery.html",
          },
          {
            "code": "const response = await useGraphqlQuery('usersPaginated', { limit: 1, offset: 1 })

        // response.data is UsersPaginatedQuery | undefined
        console.log(response.data)",
            "description": "useGraphqlQuery: Returns a promise. Can be used anywhere - in components, plugins, other composables, event handlers, or inside useAsyncData.",
            "documentationUrl": "https://nuxt-graphql-middleware.dulnan.net/composables/useGraphqlQuery.html",
          },
        ]
      `)

      // Snapshot the imports (Int variables are scalars, so only response + variables types)
      expect(structured.imports).toMatchInlineSnapshot(`
        [
          {
            "description": "Response type for the operation",
            "typeName": "UsersPaginatedQuery",
          },
          {
            "description": "Variables type for the operation",
            "typeName": "UsersPaginatedQueryVariables",
          },
        ]
      `)
    })
  })
})
