import { defineConfig } from 'cypress'

export default defineConfig({
  chromeWebSecurity: false,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  viewportWidth: 1200,
  viewportHeight: 900,
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
})
