<template>
  <div>
    <Hero title="All Content" lead="Articles, Blog Posts, and Pages" />
    <div class="section">
      <div class="container">
        <table class="table is-striped is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Author</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in content" :key="item.id">
              <td>
                <span class="tag" :class="getTypeClass(item.__typename)">
                  {{ item.__typename }}
                </span>
              </td>
              <td>
                <nuxt-link :to="`/content/${item.slug}`">
                  {{ item.title }}
                </nuxt-link>
              </td>
              <td>{{ item.slug }}</td>
              <td>
                <template v-if="item.author">
                  {{ item.author.firstName }} {{ item.author.lastName }}
                </template>
              </td>
              <td>
                <span v-if="item.publishedAt">
                  {{ formatDate(item.publishedAt) }}
                </span>
                <span v-else class="tag is-warning">Draft</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncGraphqlQuery } from '#imports'

const { data: content } = await useAsyncGraphqlQuery('allContent', null, {
  transform: (v) => v.data.allContent,
  default: () => [],
})

function getTypeClass(typename: string) {
  switch (typename) {
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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>
