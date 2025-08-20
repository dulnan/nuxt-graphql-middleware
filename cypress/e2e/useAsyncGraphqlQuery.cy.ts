describe('useAsyncGraphqlQuery', () => {
  it('is reactive', () => {
    cy.initState()
    cy.visit('/use-async-graphql-query').waitForHydration()
    cy.get('#value').should('have.text', '0')
    cy.get('#wrapped-value').should('have.text', '0')
    cy.get('#normal-value').should('have.text', '0')

    cy.get('#increment').click()
    cy.get('#value').should('have.text', '1')
    cy.get('#wrapped-value').should('have.text', '1')
    cy.get('#normal-value').should('have.text', '1')

    cy.get('#refresh').click()
    // Value should remain the same.
    cy.get('#value').should('have.text', '1')
    cy.get('#wrapped-value').should('have.text', '1')
    cy.get('#normal-value').should('have.text', '1')

    // The random value should update when calling refresh.
    cy.get('#wrapped-random')
      .invoke('text')
      .then((text) => {
        cy.get('#refresh').click()
        cy.get('#wrapped-random').should('not.eq', text)
      })

    // The random value should update when calling refresh.
    cy.get('#normal-random')
      .invoke('text')
      .then((text) => {
        cy.get('#refresh').click()
        cy.get('#normal-random').should('not.eq', text)
      })
  })
})
