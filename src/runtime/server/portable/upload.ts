import { defineHandler } from 'nuxt/server'
import { handlers } from '.'

export default defineHandler(handlers.upload)
