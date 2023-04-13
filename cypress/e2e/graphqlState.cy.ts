describe('useGraphqlState', () => {
  it('should not have a persistent state', () => {
    cy.visit('/state')
    let first = ''
    cy.get('#graphql-state-value')
      .first()
      .then((el) => {
        first = el.text()
      })

    cy.visit('/state')

    cy.get('#graphql-state-value')
      .first()
      .then((el) => {
        expect(el.text()).not.to.equal(first)
      })
  })
})
