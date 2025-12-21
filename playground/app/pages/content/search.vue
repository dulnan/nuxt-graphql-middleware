<template>
  <div>
    <Hero title="Search" lead="Search across all content and users" />
    <div class="section">
      <div class="container">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input
              v-model="searchQuery"
              class="input is-medium"
              type="text"
              placeholder="Search for content or users..."
              @keyup.enter="performSearch"
            />
          </div>
          <div class="control">
            <button class="button is-medium is-primary" @click="performSearch">
              Search
            </button>
          </div>
        </div>

        <div v-if="results && results.length > 0" class="mt-5">
          <p class="mb-4">Found {{ results.length }} result(s)</p>
          <div class="columns is-multiline">
            <div
              v-for="(item, index) in results"
              :key="index"
              class="column is-6"
            >
              <div class="card">
                <div class="card-content">
                  <div class="media">
                    <div class="media-content">
                      <p class="title is-5">
                        <template v-if="item.__typename === 'User'">
                          {{ item.firstName }} {{ item.lastName }}
                        </template>
                        <template v-else>
                          <nuxt-link :to="`/content/${item.slug}`">
                            {{ item.title }}
                          </nuxt-link>
                        </template>
                      </p>
                      <p class="subtitle is-6">
                        <span
                          class="tag"
                          :class="getTypeClass(item.__typename)"
                        >
                          {{ item.__typename }}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div class="content">
                    <template v-if="item.__typename === 'User'">
                      <p>{{ item.email }}</p>
                    </template>
                    <template v-else-if="item.__typename === 'Article'">
                      <p>{{ item.excerpt }}</p>
                      <span class="tag is-light">{{ item.category }}</span>
                    </template>
                    <template v-else-if="item.__typename === 'BlogPost'">
                      <p>{{ truncate(item.content, 100) }}</p>
                      <div class="tags">
                        <span
                          v-for="tag in item.tags"
                          :key="tag"
                          class="tag is-success is-light"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </template>
                    <template v-else-if="item.__typename === 'Page'">
                      <span class="tag is-primary is-light">{{
                        item.template
                      }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="hasSearched && (!results || results.length === 0)"
          class="mt-5"
        >
          <div class="notification is-warning">
            No results found for "{{ lastSearchQuery }}"
          </div>
        </div>

        <div v-else class="mt-5">
          <div class="notification is-info is-light">
            Enter a search term to find content and users. Try searching for
            "graphql", "nuxt", or "john".
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGraphqlQuery } from '#imports'

const searchQuery = ref('')
const lastSearchQuery = ref('')
const hasSearched = ref(false)
const results = ref<any[]>([])

async function performSearch() {
  if (!searchQuery.value.trim()) return

  hasSearched.value = true
  lastSearchQuery.value = searchQuery.value

  const response = await useGraphqlQuery('search', { query: searchQuery.value })
  results.value = response.data.search || []
}

function getTypeClass(typename: string) {
  switch (typename) {
    case 'User':
      return 'is-link'
    case 'Article':
      return 'is-info'
    case 'BlogPost':
      return 'is-success'
    case 'Page':
      return 'is-primary'
    default:
      return 'is-light'
  }
}

function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
</script>
