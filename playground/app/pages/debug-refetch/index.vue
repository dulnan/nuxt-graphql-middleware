<template>
  <section class="section">
    <div class="container">
      <h1 class="title">Debug: useAsyncGraphqlQuery Refetch</h1>
      <p class="subtitle">
        Two instances of the same component. Both inject OU context (["5"] =
        Sports). Changing the organizations prop on Instance B should override
        its injected context and trigger a refetch.
      </p>

      <div class="box">
        <h3 class="subtitle">Controls for Item B</h3>
        <div class="buttons">
          <button id="set-orgs-empty" class="button" @click="setOrgsB([])">
            Empty (use context = "5")
          </button>
          <button
            id="set-orgs-3"
            class="button"
            @click="setOrgsB([{ id: '3' }])"
          >
            [{ id: "3" }] (Culture)
          </button>
          <button
            id="set-orgs-1"
            class="button"
            @click="setOrgsB([{ id: '1' }])"
          >
            [{ id: "1" }] (Parks)
          </button>
          <button
            id="set-orgs-2-3"
            class="button"
            @click="setOrgsB([{ id: '2' }, { id: '3' }])"
          >
            [{ id: "2" }, { id: "3" }] (Roads + Culture)
          </button>
        </div>
      </div>

      <DebugNewsList
        v-for="item in items"
        :key="item.id"
        :instance-id="item.id"
        :label="item.label"
        :organizations="item.organizations"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { reactive, computed, provide } from '#imports'
import { OU_CONTEXT_KEY } from '~/helpers/ouContext'

const ouContext = computed(() => ({
  ids: ['5'],
}))
provide(OU_CONTEXT_KEY, ouContext)

const items = reactive([
  {
    id: 'a',
    label: 'Instance A — no override (always uses context)',
    organizations: { list: [] as { id: string }[] },
  },
  {
    id: 'b',
    label: 'Instance B — override changes via buttons above',
    organizations: { list: [{ id: '3' }] },
  },
])

function setOrgsB(list: { id: string }[]) {
  items[1]!.organizations = { list }
}
</script>
