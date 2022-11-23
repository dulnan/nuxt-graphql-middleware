<template>
  <div>
    <Title>Create user</Title>
    <Hero title="Create user" />
    <div class="section">
      <div class="container">
        <div class="field">
          <label class="label" for="firstName">First name</label>
          <div class="control">
            <input
              id="firstName"
              v-model="firstName"
              class="input is-medium"
              type="text"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="lastName">Last name</label>
          <div class="control">
            <input
              id="lastName"
              v-model="lastName"
              class="input is-medium"
              type="text"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="email">Email</label>
          <div class="control">
            <input
              id="email"
              v-model="email"
              class="input is-medium"
              type="text"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="dateOfBirth">Date of birth</label>
          <div class="control">
            <input
              id="dateOfBirth"
              v-model="dateOfBirth"
              class="input is-medium"
              type="date"
            />
          </div>
        </div>
        <div class="field">
          <label class="label" for="description">Description</label>
          <div class="control">
            <textarea
              id="description"
              v-model="description"
              class="textarea is-medium"
              rows="10"
            />
          </div>
        </div>

        <div class="field">
          <button class="button is-primary is-large" @click="submit">
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const firstName = ref('John')
const lastName = ref('Smith')
const description = ref('Just another user')
const email = ref('foobar@example.com')
const dateOfBirth = ref('1976-10-18')

function submit() {
  useGraphqlMutation('addUser', {
    user: {
      firstName: firstName.value,
      lastName: lastName.value,
      description: description.value,
      email: email.value,
      dateOfBirth: dateOfBirth.value,
    },
  }).then((result) => {
    const id = result.data.createUser.id
    router.push('/user/' + id)
  })
}
</script>
