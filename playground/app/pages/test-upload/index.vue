<template>
  <form @submit.prevent="upload">
    <h1>Test File Uploads</h1>
    <input type="file" id="file-single" name="file" />
    <input type="submit" id="file-single-upload" value="Upload" />
    <hr />
    <div id="upload-success">{{ isSuccess }}</div>
  </form>
</template>

<script lang="ts" setup>
import { ref, useGraphqlUploadMutation } from '#imports'

const isSuccess = ref(false)

async function upload(e: Event) {
  if (!(e.target instanceof HTMLFormElement)) {
    return
  }
  const formData = new FormData(e.target)
  const file = formData.get('file')

  const data = await useGraphqlUploadMutation('testUpload', {
    file,
  })

  isSuccess.value = data.data.uploadFile
}
</script>
