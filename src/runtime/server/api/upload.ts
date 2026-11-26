import { defineEventHandler } from 'h3'
import { handlers } from '../utils/doGraphqlRequest'

export default defineEventHandler(handlers.upload)
