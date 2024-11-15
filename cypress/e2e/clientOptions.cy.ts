describe('The clientOptions', () => {
  it('are working correctly with SSR', () => {
    cy.visit('/de')
    cy.get('#nuxt-language').first().should('have.text', 'de')
    cy.get('#response-language').first().should('have.text', 'de')
    cy.get('#server-route-language').first().should('have.text', 'de')

    cy.visit('/fr')
    cy.get('#nuxt-language').first().should('have.text', 'fr')
    cy.get('#response-language').first().should('have.text', 'fr')
    cy.get('#server-route-language').first().should('have.text', 'fr')
  })

  it('are working correctly with SPA', () => {
    cy.visit('/')
    cy.get('#link-client-options').click()
    cy.get('#nuxt-language').first().should('have.text', 'de')
    cy.get('#response-language').first().should('have.text', 'de')
    cy.get('#server-route-language').first().should('have.text', 'de')

    cy.get('#lang-switch-fr').click()

    cy.get('#nuxt-language').first().should('have.text', 'fr')
    cy.get('#response-language').first().should('have.text', 'fr')
    cy.get('#server-route-language').first().should('have.text', 'fr')
  })
})
