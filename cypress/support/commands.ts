import 'cypress-wait-until'

Cypress.Commands.add('initState', () => {
  cy.request('POST', '/api/graphql_middleware/mutation/initState')
})

Cypress.Commands.add('waitForHydration', () => {
  cy.waitUntil(() =>
    cy.window().then((win) => (win as any).useNuxtApp().isHydrating === false),
  )
})
