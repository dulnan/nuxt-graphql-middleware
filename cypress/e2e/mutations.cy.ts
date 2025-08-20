describe('Mutations', () => {
  it('deletes a user through a mutation', () => {
    cy.initState()
    cy.visit('/').waitForHydration()
    cy.get('table tbody tr')
      .first()
      .should('contain.text', 'mhonatsch0@constantcontact.com')
    cy.wait(1000)
    cy.get('table button.is-danger').first().click()
    cy.wait(1000)
    cy.get('table tbody tr')
      .first()
      .should('contain.text', 'jkenworthy1@jiathis.com')
    cy.get('table').should('not.contain.text', 'mhonatsch0@constantcontact.com')
  })

  it('adds a user through a mutation', () => {
    const firstName = 'James'
    const lastName = 'Miller'
    const email = 'test@example.com'
    const dateOfBirth = '1980-01-01'
    const description = 'This is a cypress test user.'

    cy.initState()
    cy.visit('/user/add').waitForHydration()

    cy.get('#firstName').clear().type(firstName)
    cy.get('#lastName').clear().type(lastName)
    cy.get('#email').clear().type(email)
    cy.get('#dateOfBirth').clear().type(dateOfBirth)
    cy.get('#description').clear().type(description)

    cy.get('.section .container .button.is-primary').click()

    cy.url().should('contain', '/user/41')
    cy.get('.hero').should('contain.text', firstName)
    cy.get('.hero').should('contain.text', description)
    cy.get('.section .container').should('contain.text', email)

    cy.visit('/').waitForHydration()
    cy.get('table tbody tr').should('have.lengthOf', 41)
    cy.get('table').should('contain.text', email)
  })
})
