describe('SSR request deduplication', () => {
  it('only makes one GraphQL request when two instances use the same query and variables', () => {
    // Reset the counter.
    cy.request('http://localhost:4000/news-query-count')

    // Visit the page via SSR (two DebugNewsList instances, both with
    // the same initial variables: ouIds=["5"], limit=3).
    cy.visit('/debug-refetch').waitForHydration()

    // Both instances should have rendered with data.
    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-status="b"]').should('have.text', 'OK')

    // The Apollo server should have received exactly one request,
    // not two, because the SSR deduplication should share the promise.
    cy.request('http://localhost:4000/news-query-count').then((response) => {
      expect(response.body.count).to.equal(1)
    })
  })
})
