describe('The clientOptions', () => {
  it('are working correctly with SSR', () => {
    cy.visit('/de')
    cy.get('#nuxt-language').first().should('have.text', 'de')
    cy.get('#response-language').first().should('have.text', 'de')
  })

  it('are working correctly with SPA', () => {
    cy.visit('/')
    cy.get('#link-client-options').click()
    cy.get('#nuxt-language').first().should('have.text', 'de')
    cy.get('#response-language').first().should('have.text', 'de')

    cy.get('#lang-switch-fr').click()

    cy.get('#nuxt-language').first().should('have.text', 'fr')
    cy.get('#response-language').first().should('have.text', 'fr')
  })
})
