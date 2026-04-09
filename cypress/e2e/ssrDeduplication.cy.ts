describe('SSR request deduplication', () => {
  it('makes separate requests for instances with different variables', () => {
    // Reset the counter.
    cy.request('http://localhost:4000/news-query-count')

    // Visit the page via SSR. Instance A uses context (ouIds=["5"]),
    // Instance B uses override (ouIds=["3"]) — different variables.
    cy.visit('/debug-refetch').waitForHydration()

    // Both instances should have rendered with their own data.
    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')
    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '3')

    // Different variables means two separate requests — no deduplication.
    cy.request('http://localhost:4000/news-query-count').then((response) => {
      expect(response.body.count).to.equal(2)
    })
  })
})
