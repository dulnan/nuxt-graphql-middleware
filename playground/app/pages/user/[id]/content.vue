<template>
  <div>
    <Title>Content by User {{ route.params.id }}</Title>
    <Hero :title="`Content by User ${route.params.id}`" lead="All content created by this user" />

    <div class="section">
      <div class="container">
        <div v-if="userContent.length === 0" class="notification is-info">
          No content found for this user.
        </div>

        <div v-for="item in userContent" :key="item.id" class="box">
          <h2 class="title is-4">{{ item.title }}</h2>
          <p class="subtitle is-6">
            <span class="tag is-primary">{{ item.__typename }}</span>
            <span v-if="item.publishedAt" class="ml-2">
              Published: {{ new Date(item.publishedAt).toLocaleDateString() }}
            </span>
          </p>

          <div v-if="item.__typename === 'Article' && 'excerpt' in item">
            <p>{{ item.excerpt }}</p>
            <span class="tag is-link">{{ item.category }}</span>
          </div>

          <div v-else-if="item.__typename === 'BlogPost' && 'tags' in item">
            <p>{{ item.content }}</p>
            <div class="tags">
              <span v-for="tag in item.tags" :key="tag" class="tag is-info">{{ tag }}</span>
            </div>
          </div>

          <div v-else-if="item.__typename === 'Page' && 'template' in item">
            <p>{{ item.content }}</p>
            <span class="tag is-warning">Template: {{ item.template }}</span>
          </div>

          <NuxtLink :to="`/content/${item.slug}`" class="button is-small is-link mt-3">
            View
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useAsyncGraphqlQuery } from '#imports'

const route = useRoute()

const userId = computed(() => (route.params.id || '').toString())

const { data } = await useAsyncGraphqlQuery('contentByUser')

const userContent = computed(() => {
  if (!data.value?.data.allContent) {
    return []
  }
  return data.value.data.allContent.filter(
    (item) => item.author?.id?.toString() === userId.value
  )
})
</script>
