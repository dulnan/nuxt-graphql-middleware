import { defineEventHandler } from 'h3'
import { renderDebugPage } from '../debug'

export default defineEventHandler(renderDebugPage)
