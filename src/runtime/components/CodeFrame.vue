<template>
  <div class="nuxt-graphql-middleware-errors-code">
    <div>
      <div
        v-for="(l, i) in lines"
        :key="'lineNumber' + i"
        class="nuxt-graphql-middleware-errors-code-line-number"
        :class="{ 'ngm-is-highlighted': l.isHighlighted }"
      >
        <div v-html="l.lineNumber" />
      </div>
    </div>
    <div>
      <div
        v-for="(l, i) in lines"
        :key="'code' + i"
        class="nuxt-graphql-middleware-errors-code-code"
        :class="{ 'ngm-is-highlighted': l.isHighlighted }"
      >
        <div v-html="l.code" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{
  source: string
  line: number
  column: number
}>()

const before = 20
const after = 20

const lines = computed(() => {
  const fullLines = props.source.split('\n')
  const indexStart = Math.max(props.line - before - 1, 0)
  const indexEnd = Math.min(props.line + after, fullLines.length)

  // Take only the lines we care about
  const sliced = fullLines.slice(indexStart, indexEnd)

  // Remove trailing empty lines
  while (sliced.length && !sliced[sliced.length - 1]?.trim()) {
    sliced.pop()
  }

  // Map to your final structure
  return sliced.map((code, i) => {
    const lineNumber = indexStart + i + 1
    return {
      lineNumber,
      code,
      isHighlighted: lineNumber === props.line,
    }
  })
})
</script>
