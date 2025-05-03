import { defineNuxtPlugin, useState } from '#imports'
import type { OperationResponseError } from './../types'
import { createApp } from 'vue'
import DevModeOverlay from '../components/DevModeOverlay.vue'
import { importMetaClient } from '#nuxt-graphql-middleware/config'

export default defineNuxtPlugin({
  name: 'nuxt-graphql-middleware:dev-mode',
  setup(nuxtApp) {
    const errors = useState<OperationResponseError[]>(
      'nuxt-graphql-middleware-errors',
      () => [],
    )

    nuxtApp.hook('nuxt-graphql-middleware:errors', (value) => {
      errors.value.push(value)
    })

    // Mount the component.
    if (importMetaClient) {
      nuxtApp.hook('app:mounted', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const instance = createApp(DevModeOverlay)
        instance.mount(container)
      })
    }
  },
})
