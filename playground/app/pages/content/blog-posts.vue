<template>
  <div>
    <Hero title="Blog Posts" lead="Personal blog posts with tags" />
    <div class="section">
      <div class="container">
        <div class="columns is-multiline">
          <div v-for="post in blogPosts" :key="post.id" class="column is-6">
            <div class="card">
              <div class="card-content">
                <p class="title is-4">
                  <nuxt-link :to="`/content/${post.slug}`">
                    {{ post.title }}
                  </nuxt-link>
                </p>
                <p class="subtitle is-6">
                  <span v-if="post.author">
                    by {{ post.author.firstName }} {{ post.author.lastName }}
                  </span>
                </p>
                <div class="content">
                  {{ truncate(post.content, 150) }}
                </div>
                <div class="tags">
                  <span
                    v-for="tag in post.tags"
                    :key="tag"
                    class="tag is-success is-light"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <footer class="card-footer">
                <span class="card-footer-item">
                  <template v-if="post.publishedAt">
                    {{ formatDate(post.publishedAt) }}
                  </template>
                  <span v-else class="tag is-warning">Draft</span>
                </span>
                <nuxt-link
                  :to="`/content/${post.slug}`"
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

const { data: blogPosts } = await useAsyncGraphqlQuery('blogPosts', null, {
  transform: (v) => v.data.blogPosts,
  default: () => [],
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}

function truncate(text: string, length: number) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
</script>
