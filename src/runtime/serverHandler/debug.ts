import { defineEventHandler } from 'h3'
import { GraphqlMiddlewareRuntimeConfig } from '../../types'
import { documents } from '#graphql-documents'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(() => {
  let body = '<h1>nuxt-graphql-middleware debug</h1>'

  function getEndpoint(operation: string, operationName: string): string {
    const config = useRuntimeConfig()
    return `${config?.public?.['nuxt-graphql-middleware']?.serverApiPrefix}/${operation}/${operationName}`
  }

  Object.entries(documents).forEach(([operationType, items]) => {
    body += `<h2>${operationType}</h2>`
    Object.entries(items).forEach(([operationName, operation]) => {
      const url = getEndpoint(operationType, operationName)
      body += `<h3>${operationName}</h3>`
      body += `<a href="${url}">${url}</a>`
      body += `<textarea rows="10">${operation}</textarea>`
    })
  })

  return `
    <html>
      <head>
    <style>
    textarea {
    display: block;
      width: 100%;
    }
    </style>
      </head>
      <body>${body}</body>
    </html>
    `
})
