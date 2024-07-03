<template>
  <div>
    <h1>Test File Uploads</h1>
    <input type="file" @change="onChange" />
    <button @click.prevent="upload">UPLOAD</button>
    <hr />

    <h1>Test Multiple File Uploads</h1>
    <input type="file" @change="onChangeMultiple" multiple />
    <button @click.prevent="uploadMultiple">UPLOAD MULTIPLE</button>
    <hr />
  </div>
</template>

<script lang="ts" setup>
import { ref, useGraphqlUploadMutation } from '#imports'

const file = ref<File | null>(null)

const files = ref<File[]>([])

function onChange(e: Event) {
  if (e.target instanceof HTMLInputElement && e.target.files) {
    const files = [...e.target.files]
    file.value = files[0] || null
  }
}

async function upload() {
  const data = await useGraphqlUploadMutation('testUpload', {
    id: 'test',
    file: file.value,
  })
}

function onChangeMultiple(e: Event) {
  if (e.target instanceof HTMLInputElement && e.target.files) {
    files.value = [...e.target.files]
  }
}

async function uploadMultiple() {
  const data = await useGraphqlUploadMutation('testFormSubmit', {
    elements: files.value.map((file) => {
      return {
        name: file.name,
        file: file,
      }
    }),
  })
}
</script>
