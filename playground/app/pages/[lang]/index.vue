<template>
  <div>
    <div>
      <h1>
        Current language in Nuxt: <span id="nuxt-language">{{ language }}</span>
      </h1>
      <p>
        Current language in response:
        <span id="response-language">{{ withTransform }}</span>
      </p>

      <p>
        Current language via server route:
        <span id="server-route-language">{{ serverRouteLanguage }}</span>
      </p>

      <ul>
        <li v-for="lang in languages" :key="lang">
          <NuxtLink
            :id="'lang-switch-' + lang"
            :to="{
              params: {
                lang,
              },
            }"
            >{{ lang }}</NuxtLink
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  useAsyncGraphqlQuery,
  useCurrentLanguage,
  useFetch,
  useRoute,
} from '#imports'

const language = useCurrentLanguage()
const route = useRoute()

const languages = ['de', 'en', 'fr']

const { data: withTransform } = await useAsyncGraphqlQuery(
  'testClientOptions',
  {
    path: route.path,
  },
  {
    transform: function (data): string[] {
      return [data.data.testClientOptions?.language || 'foobar']
    },
    default: () => {
      return 'asdf'
    },
  },
)

const { data: withoutTransform } = await useAsyncGraphqlQuery(
  'testClientOptions',
  {
    path: route.path,
  },
  {
    default: function () {
      return 'aasdf'
    },
  },
)

console.log(withoutTransform.value)

const { data: serverRouteLanguage } = await useFetch('/api/client-options', {
  key: 'api-client-options',
  params: {
    language: language.value,
  },
})
</script>
