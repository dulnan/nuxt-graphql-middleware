describe('The client cache', () => {
  it('Uses an existing payload when available', () => {
    // Visit the page so that it contains the payload.
    cy.visit('/caching').waitForHydration()

    // Get the current time value.
    cy.get('#current-time')
      .invoke('text')
      .then((time) => {
        // Go to home.
        cy.get('#home-link').click()
        cy.wait(100).then(() => {
          // Go back to the page.
          cy.get('#link-caching').click()
          // The time should be the same, because the response from the payload was used.
          cy.get('#current-time').should('have.text', time)
        })
      })
  })

  it('stores a response in memory', () => {
    // Visit the home page.
    cy.visit('/').waitForHydration()

    // Go to the caching page. This will make the query and then store it in the client cache.
    cy.get('#link-caching').click()

    // Get the current time value.
    cy.get('#current-time')
      .invoke('text')
      .then((time) => {
        // Go to home.
        cy.get('#home-link').click()
        cy.wait(100).then(() => {
          // Go back to the page.
          cy.get('#link-caching').click()
          // The time should be the same, because the response was stored in the cache.
          cy.get('#current-time').should('have.text', time)
        })
      })
  })
})
