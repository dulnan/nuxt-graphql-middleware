<template>
  <div>
    <Hero
      title="Articles"
      lead="Long-form articles with excerpts and categories"
    />
    <div class="section">
      <div class="container">
        <div class="columns is-multiline">
          <div
            v-for="article in articles"
            :key="article.id"
            class="column is-6"
          >
            <div class="card">
              <div class="card-content">
                <p class="title is-4">
                  <nuxt-link :to="`/content/${article.slug}`">
                    {{ article.title }}
                  </nuxt-link>
                </p>
                <p class="subtitle is-6">
                  <span class="tag is-info">{{ article.category }}</span>
                  <span v-if="article.author" class="ml-2">
                    by {{ article.author.firstName }}
                    {{ article.author.lastName }}
                  </span>
                </p>
                <div class="content">
                  {{ article.excerpt }}
                </div>
              </div>
              <footer class="card-footer">
                <span class="card-footer-item">
                  <template v-if="article.publishedAt">
                    {{ formatDate(article.publishedAt) }}
                  </template>
                  <span v-else class="tag is-warning">Draft</span>
                </span>
                <nuxt-link
                  :to="`/content/${article.slug}`"
                  class="card-footer-item"
                >
                  Read more
                </nuxt-link>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncGraphqlQuery } from '#imports'

const { data: articles } = await useAsyncGraphqlQuery('articles', null, {
  transform: (v) => v.data.articles,
  default: () => [],
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>
