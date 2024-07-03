<template>
  <div>
    <form @submit.prevent="onSubmit">
      <h1>Test Multiple File Uploads</h1>
      <label>
        <div>First name</div>
        <input type="text" v-model="firstName" id="firstname" />
      </label>
      <label>
        <div>Last name</div>
        <input type="text" v-model="lastName" id="lastname" />
      </label>
      <label>
        <div>Documents</div>
        <input type="file" name="files" multiple id="file-multiple" />
      </label>
      <input id="submit" type="submit" value="Submit" />
    </form>
    <hr />

    <div id="upload-success">{{ isSuccess }}</div>

    <hr />

    <table id="submissions-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Documents</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="submission in submissions" :key="submission.id">
          <td class="submissionId">{{ submission.id }}</td>
          <td class="firstName">{{ submission.firstName }}</td>
          <td class="lastName">{{ submission.lastName }}</td>
          <td class="documents">
            <ul>
              <li v-for="doc in submission.documents">
                <h3 class="docName">{{ doc?.name }}</h3>
                <p>{{ doc?.file.id }}</p>
                <p class="fileName">{{ doc?.file.name }}</p>
                <p class="content">{{ doc?.file.content }}</p>
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { ref, useGraphqlUploadMutation, useAsyncGraphqlQuery } from '#imports'
import { falsy } from '../../../src/runtime/helpers'

const { data: submissions, refresh } = await useAsyncGraphqlQuery(
  'getSubmissions',
  null,
  {
    transform: (v) => (v.data.getSubmissions || []).filter(falsy),
  },
)

const firstName = ref('')
const lastName = ref('')

const isSuccess = ref(false)

async function onSubmit(e: SubmitEvent) {
  if (!(e.target instanceof HTMLFormElement)) {
    return
  }
  const formData = new FormData(e.target)
  const files = (formData.getAll('files') || []) as File[]
  console.log(files)
  const data = await useGraphqlUploadMutation('testFormSubmit', {
    input: {
      firstName: firstName.value,
      lastName: lastName.value,
      documents: files.map((file) => {
        return {
          file,
          name: file.size.toString(),
        }
      }),
    },
  })

  isSuccess.value = data.data.submitForm

  await refresh()
}
</script>
