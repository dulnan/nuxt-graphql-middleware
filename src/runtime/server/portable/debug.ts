import { defineHandler } from 'nuxt/server'
import { renderDebugPage } from '../debug'

export default defineHandler(renderDebugPage)
