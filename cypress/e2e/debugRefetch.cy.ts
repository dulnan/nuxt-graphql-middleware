describe('useAsyncGraphqlQuery refetch with multiple instances', () => {
  beforeEach(() => {
    cy.visit('/debug-refetch').waitForHydration()
  })

  it('Instance A shows Sports (context "5"), Instance B shows Culture (override "3")', () => {
    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')

    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '3')
    cy.get('[data-actual-org-ids="b"]').should('not.contain', '5')
  })

  it('changing Instance B orgs to "1" refetches with Parks data', () => {
    cy.get('#set-orgs-1').click()

    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '1')
    cy.get('[data-actual-org-ids="b"]').should('not.contain', '3')

    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')
  })

  it('changing Instance B orgs to multiple IDs refetches correctly', () => {
    cy.get('#set-orgs-2-3').click()

    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('not.contain', '5')

    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')
  })

  it('resetting Instance B orgs to empty falls back to context', () => {
    cy.get('#set-orgs-empty').click()
    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '5')

    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')
  })

  it('switching Instance B through multiple org changes keeps data fresh', () => {
    // Culture (initial "3") -> Parks -> empty (context) -> Culture again
    cy.get('#set-orgs-1').click()
    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '1')

    cy.get('#set-orgs-empty').click()
    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '5')

    cy.get('#set-orgs-3').click()
    cy.get('[data-status="b"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="b"]').should('contain', '3')

    // Instance A must remain untouched throughout.
    cy.get('[data-status="a"]').should('have.text', 'OK')
    cy.get('[data-actual-org-ids="a"]').should('contain', '5')
  })
})
