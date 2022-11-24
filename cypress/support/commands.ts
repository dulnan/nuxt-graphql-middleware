Cypress.Commands.add('initState', () => {
  cy.request('POST', '/api/graphql_middleware/mutation/initState')
})
