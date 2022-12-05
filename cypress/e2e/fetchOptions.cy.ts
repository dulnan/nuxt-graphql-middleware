describe('Fetch options', () => {
  it('should be set and passed correctly', () => {
    cy.initState()
    cy.visit('/fetch-options')

    cy.get('#fetch-options-graphql-client').should(
      'have.text',
      'The header value from the client',
    )
    cy.get('#fetch-options-graphql-server').should(
      'have.text',
      'Value from server',
    )
    cy.get('#fetch-options-api-client').should('have.text', '')
    cy.get('#fetch-options-api-server').should('have.text', 'Value from server')
  })
})
