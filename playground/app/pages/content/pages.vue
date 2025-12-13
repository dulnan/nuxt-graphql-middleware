<template>
  <div>
    <Hero title="Pages" lead="Static pages with templates" />
    <div class="section">
      <div class="container">
        <table class="table is-striped is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Template</th>
              <th>Author</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in pages" :key="page.id">
              <td>
                <nuxt-link :to="`/content/${page.slug}`">
                  {{ page.title }}
                </nuxt-link>
              </td>
              <td>
                <code>{{ page.slug }}</code>
              </td>
              <td>
                <span class="tag is-primary is-light">{{ page.template }}</span>
              </td>
              <td>
                <template v-if="page.author">
                  {{ page.author.firstName }} {{ page.author.lastName }}
                </template>
              </td>
              <td>
                <template v-if="page.publishedAt">
                  {{ formatDate(page.publishedAt) }}
                </template>
                <span v-else class="tag is-warning">Draft</span>
              </td>
              <td>
                <nuxt-link
                  :to="`/content/${page.slug}`"
                  class="button is-small"
                >
                  View
                </nuxt-link>
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

const { data: pages } = await useAsyncGraphqlQuery('pages', null, {
  transform: (v) => v.data.pages,
  default: () => [],
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>
