describe('useGraphqlState', () => {
  it('should not have a persistent state', () => {
    cy.visit('/state').waitForHydration()
    let first = ''
    cy.get('#graphql-state-value')
      .first()
      .then((el) => {
        first = el.text()
      })

    cy.visit('/state').waitForHydration()

    cy.get('#graphql-state-value')
      .first()
      .then((el) => {
        expect(el.text()).not.to.equal(first)
      })
  })
})
