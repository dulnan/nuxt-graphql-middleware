import { defineEventHandler } from 'h3'
import { operations } from '#graphql-documents'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(() => {
  function getEndpoint(operation: string, operationName: string): string {
    const config = useRuntimeConfig()
    return `${config?.public?.['nuxt-graphql-middleware']?.serverApiPrefix}/${operation}/${operationName}`
  }

  let body = '<h1>nuxt-graphql-middleware debug</h1>'

  body += '<table><tbody>'
  Object.entries(operations).forEach(([operationType, items]) => {
    Object.entries(items).forEach(([operationName, operation]) => {
      body += '<tr>'
      body += `<td style="font-size: 1.5rem">${operationType}</td>`
      const url = getEndpoint(operationType, operationName)
      body += `<td>
        <strong style="font-size: 1.5rem">${operationName}</strong><br>
        <a href="${url}">${url}</a>
      </td>`
      body += `<td style="width: 30%"><textarea readonly rows="5">${operation}</textarea></td>`
      body += '</tr>'
    })
  })
  body += '</tbody></table>'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: sans-serif;
          }
          textarea {
            display: block;
            width: 100%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            vertical-align: top;
            border-bottom: 1px solid;
            padding: 0.5rem 0;
        }
        </style>
      </head>
      <body>${body}</body>
    </html>`
})
