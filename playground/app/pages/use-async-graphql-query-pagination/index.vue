<template>
  <section class="section">
    <div class="container">
      <h1 class="title">useAsyncGraphqlQuery Server-Side Pagination Test</h1>
      <p class="subtitle">
        Testing useAsyncGraphqlQuery with server-side pagination
      </p>
      <div class="notification is-warning">
        <p>
          <strong>Test Server-Side Pagination:</strong> This page uses
          server-side pagination with limit/offset parameters to test reactivity
          of variables in useAsyncGraphqlQuery when parameters change.
        </p>
      </div>

      <!-- Loading and Error States -->
      <div v-if="pending" class="notification is-info">
        <p>Loading users...</p>
      </div>

      <div v-if="error" class="notification is-danger">
        <p>Error loading users: {{ error }}</p>
      </div>

      <!-- Users Table -->
      <div
        v-if="paginatedUsers && (paginatedUsers as any).users?.length > 0"
        class="box"
      >
        <h2 class="subtitle">
          Users (Page {{ currentPage }} of {{ totalPages }})
        </h2>
        <table class="table is-striped is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in (paginatedUsers as any).users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.firstName }} {{ user.lastName }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.description || 'No description' }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination Controls -->
        <nav
          class="pagination is-centered"
          role="navigation"
          aria-label="pagination"
        >
          <button
            class="pagination-previous"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </button>

          <button
            class="pagination-next"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Next
          </button>

          <ul class="pagination-list">
            <li v-for="page in visiblePages" :key="page">
              <button
                class="pagination-link"
                :class="{ 'is-current': page === currentPage }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </li>
          </ul>
        </nav>

        <!-- Debug Information -->
        <div class="box mt-4">
          <h3 class="subtitle is-6">Debug Information</h3>
          <div class="content">
            <p><strong>Current Page:</strong> {{ currentPage }}</p>
            <p><strong>Total Pages:</strong> {{ totalPages }}</p>
            <p>
              <strong>Total Users (from server):</strong>
              {{ (paginatedUsers as any)?.totalCount || 0 }}
            </p>
            <p><strong>Users per page:</strong> {{ limit }}</p>
            <p>
              <strong>Showing users:</strong> {{ startIndex + 1 }}-{{
                endIndex
              }}
              ({{ (paginatedUsers as any)?.users?.length || 0 }} users)
            </p>
            <p><strong>Query String Page:</strong> {{ pageQuery }}</p>
            <p>
              <strong>Server response:</strong> offset={{
                (paginatedUsers as any)?.offset || 0
              }}, limit={{ (paginatedUsers as any)?.limit || 0 }}
            </p>
            <p>
              <strong>Current offset:</strong>
              {{ (currentPage - 1) * limit }}
            </p>
            <p><strong>Current limit:</strong> {{ limit }}</p>
          </div>
        </div>
      </div>

      <!-- No Users Message -->
      <div v-else-if="!pending && !error" class="notification is-warning">
        <p>No users found.</p>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UsersPaginatedQueryVariables } from '#graphql-operations'
import { computed, ref, watch } from '#imports'
import { useAsyncGraphqlQuery } from '#imports'
import { useQueryString } from '~/composables/useQueryString'

// Configuration
const limit = ref(3)

// Query string management
const pageQuery = useQueryString('page', '1')

// Convert page query to number, default to 1
const currentPage = computed(() => {
  const page = parseInt(pageQuery.value) || 1
  return Math.max(1, page) // Ensure page is at least 1
})

const offset = computed(() => (currentPage.value - 1) * limit.value)

const variables = computed<UsersPaginatedQueryVariables>(() => {
  return {
    limit: limit.value,
    offset: offset.value,
  }
})

// GraphQL query using useAsyncGraphqlQuery with server-side pagination
const {
  data: paginatedUsers,
  pending,
  error,
  refresh,
} = await useAsyncGraphqlQuery('usersPaginated', variables, {
  transform: (response) => {
    console.log('GraphQL response:', response)
    return (
      response.data?.usersPaginated || {
        users: [],
        totalCount: 0,
        offset: 0,
        limit: 0,
      }
    )
  },
  graphqlCaching: {
    client: true,
  },
  default: () => ({ users: [], totalCount: 0, offset: 0, limit: 0 }),
})

// Pagination calculations using server data
const totalPages = computed(() => {
  const totalCount = (paginatedUsers.value as any)?.totalCount || 0
  return Math.max(1, Math.ceil(totalCount / limit.value))
})

const startIndex = computed(() => (currentPage.value - 1) * limit.value)
const endIndex = computed(() => {
  const users = (paginatedUsers.value as any)?.users || []
  return startIndex.value + users.length
})

// Visible pages for pagination (show max 5 pages)
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  const start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Navigation functions
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    pageQuery.value = page.toString()
  }
}
</script>

<style scoped>
.pagination {
  margin-top: 1rem;
}

.box {
  margin-bottom: 1rem;
}

.notification {
  margin-bottom: 1rem;
}
</style>
