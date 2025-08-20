import 'cypress-wait-until'

Cypress.Commands.add('initState', () => {
  return cy.request('POST', '/api/graphql_middleware/mutation/initState')
})

Cypress.Commands.add('waitForHydration', () => {
  return cy.waitUntil(() =>
    cy.window().then((win) => (win as any).useNuxtApp().isHydrating === false),
  )
})
