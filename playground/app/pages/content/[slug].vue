<template>
  <div v-if="content">
    <Hero :title="content.title" :lead="getSubtitle(content)" />
    <div class="section">
      <div class="container">
        <div class="columns">
          <div class="column is-8">
            <article class="content is-medium">
              <template v-if="content.__typename === 'Article'">
                <p class="has-text-weight-semibold is-size-5">
                  {{ content.excerpt }}
                </p>
                <hr />
                <div>{{ content.body }}</div>
              </template>
              <template v-else-if="content.__typename === 'BlogPost'">
                <div>{{ content.content }}</div>
              </template>
              <template v-else-if="content.__typename === 'Page'">
                <div>{{ content.content }}</div>
              </template>
            </article>
          </div>
          <div class="column is-4">
            <div class="box">
              <h3 class="title is-5">Details</h3>
              <p>
                <strong>Type:</strong>
                <span
                  class="tag ml-2"
                  :class="getTypeClass(content.__typename)"
                >
                  {{ content.__typename }}
                </span>
              </p>
              <p class="mt-3">
                <strong>Author:</strong>
                <template v-if="content.author">
                  {{ content.author.firstName }} {{ content.author.lastName }}
                </template>
                <span v-else class="has-text-grey">Unknown</span>
              </p>
              <p class="mt-3">
                <strong>Published:</strong>
                <template v-if="content.publishedAt">
                  {{ formatDate(content.publishedAt) }}
                </template>
                <span v-else class="tag is-warning">Draft</span>
              </p>
              <template v-if="content.__typename === 'Article'">
                <p class="mt-3">
                  <strong>Category:</strong>
                  <span class="tag is-info ml-2">{{ content.category }}</span>
                </p>
              </template>
              <template
                v-if="content.__typename === 'BlogPost' && content.tags?.length"
              >
                <p class="mt-3"><strong>Tags:</strong></p>
                <div class="tags mt-2">
                  <span
                    v-for="tag in content.tags"
                    :key="tag"
                    class="tag is-success is-light"
                  >
                    {{ tag }}
                  </span>
                </div>
              </template>
              <template v-if="content.__typename === 'Page'">
                <p class="mt-3">
                  <strong>Template:</strong>
                  <span class="tag is-primary is-light ml-2">{{
                    content.template
                  }}</span>
                </p>
              </template>
            </div>
            <nuxt-link to="/content" class="button is-light mt-4">
              Back to all content
            </nuxt-link>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <Hero
      title="Content Not Found"
      lead="The requested content could not be found"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useAsyncGraphqlQuery } from '#imports'

const route = useRoute()

const variables = computed(() => ({
  slug: route.params.slug as string,
}))

const { data: content } = await useAsyncGraphqlQuery(
  'contentBySlug',
  variables,
  {
    transform: (v) => v.data.contentBySlug,
  },
)

function getSubtitle(item: NonNullable<typeof content.value>) {
  if (item.__typename === 'Article') {
    return `Article in ${item.category}`
  }
  if (item.__typename === 'BlogPost') {
    return 'Blog Post'
  }
  if (item.__typename === 'Page') {
    return `Page using ${item.template} template`
  }
  return ''
}

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
