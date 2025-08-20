describe('Queries', () => {
  it('loads the list of users', () => {
    cy.initState()
    cy.visit('/').waitForHydration()
    cy.get('h1').contains('List of users')
    cy.get('table tbody tr').should('have.lengthOf', 40)
  })

  it('load a user detail page', () => {
    cy.initState()
    cy.visit('/user/7').waitForHydration()
    cy.get('h1').contains('Kerwinn Kocher')
  })

  it('performs queries via API route', () => {
    cy.initState()
    cy.visit('/emails').waitForHydration()
    cy.get('ul li').should('have.have.lengthOf', 40)
    cy.get('ul li')
      .first()
      .should('contain.text', 'mhonatsch0@constantcontact.com')
  })
})
