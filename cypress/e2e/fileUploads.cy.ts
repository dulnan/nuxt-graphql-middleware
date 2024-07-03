describe('Mutations with file uploads', () => {
  it('correctly saves a single file', () => {
    cy.initState()
    cy.visit('/test-upload')
    cy.fixture('check.svg', null).as('check-svg')
    cy.get('#file-single')
      .selectFile('@check-svg')
      .trigger('change')
      .then(() => {
        cy.wait(1000).then(() => {
          cy.get('#file-single-upload').should('be.visible')
          cy.get('#file-single-upload').trigger('click')
          cy.get('#file-single-upload').click({ force: true })
          cy.get('#upload-success').should('contain.text', 'true')
        })
      })
  })

  it('correctly saves multiple files', () => {
    cy.initState()
    cy.visit('/test-upload/contact')
      .wait(1000)
      .then(() => {
        cy.fixture('one.txt', null).as('one')
        cy.fixture('two.txt', null).as('two')
        cy.fixture('three.txt', null).as('three')
        cy.fixture('four.txt', null).as('four')

        cy.get('#firstname').type('John')
        cy.get('#lastname').type('Wayne')

        cy.get('#file-multiple')
          .selectFile(['@one', '@four', '@two', '@three'])
          .trigger('change')
          .then(() => {
            cy.wait(1000).then(() => {
              cy.get('#submit').should('be.visible')
              cy.get('#submit').trigger('click')
              cy.get('#submit').click({ force: true })
              cy.get('#upload-success').should('contain.text', 'true')

              // Test that the submission was correct.
              cy.get('#submissions-table tbody tr')
                .eq(0)
                .within(() => {
                  // Text values are correct.
                  cy.get('.firstName').should('have.text', 'John')
                  cy.get('.lastName').should('have.text', 'Wayne')
                  cy.get('.documents').within(() => {
                    // Size of file was used correctly as name.
                    // "FOUR" => 4 bytes
                    cy.get('li').eq(0).find('.docName').should('have.text', '4')

                    // Check that the order of the uploaded documents was stored correctly.
                    const ORDER = ['ONE', 'FOUR', 'TWO', 'THREE']

                    for (let i = 0; i < ORDER.length; i++) {
                      const text = ORDER[i]
                      cy.get('li')
                        .eq(i)
                        .find('.content')
                        .should('have.text', text + '\n')
                    }
                  })
                })
            })
          })
      })
  })
})
