describe('useAsyncGraphqlQuery Pagination', () => {
  beforeEach(() => {
    cy.initState()
  })

  it('loads the first page of users with pagination controls', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Verify page title and description
    cy.get('h1').should(
      'contain',
      'useAsyncGraphqlQuery Server-Side Pagination',
    )
    cy.get('.subtitle').should('contain', 'server-side pagination')

    // Verify users table is visible
    cy.get('table').should('be.visible')
    cy.get('table thead th').should('have.length', 4)

    // Verify 3 users per page (limit is set to 3 in the component)
    cy.get('table tbody tr').should('have.length', 3)

    // Verify pagination controls exist
    cy.get('.pagination-previous').should('exist')
    cy.get('.pagination-next').should('exist')
    cy.get('.pagination-list').should('exist')
  })

  it('displays correct initial pagination state', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Previous button should be disabled on first page
    cy.get('.pagination-previous').should('be.disabled')

    // Next button should be enabled
    cy.get('.pagination-next').should('not.be.disabled')

    // First page button should have is-current class
    cy.get('.pagination-link.is-current').should('have.text', '1')

    // Verify debug information shows page 1
    cy.contains('Current Page:').parent().should('contain', '1')
    cy.contains('Current offset:').parent().should('contain', '0')
    cy.contains('Current limit:').parent().should('contain', '3')
  })

  it('navigates to next page using Next button', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Click Next button
    cy.get('.pagination-next').click()

    // Wait for navigation
    cy.url().should('include', 'page=2')

    // Verify page 2 is current
    cy.get('.pagination-link.is-current').should('have.text', '2')

    // Previous button should now be enabled
    cy.get('.pagination-previous').should('not.be.disabled')

    // Verify different users are shown (by checking the table reloaded)
    cy.get('table tbody tr').should('have.length', 3)

    // Verify debug information shows page 2
    cy.contains('Current Page:').parent().should('contain', '2')
    cy.contains('Current offset:').parent().should('contain', '3')
  })

  it('navigates to previous page using Previous button', () => {
    cy.visit('/use-async-graphql-query-pagination?page=2').waitForHydration()

    // Verify we're on page 2
    cy.get('.pagination-link.is-current').should('have.text', '2')

    // Click Previous button
    cy.get('.pagination-previous').click()

    // Wait for navigation
    cy.url().should('include', 'page=1')

    // Verify page 1 is current
    cy.get('.pagination-link.is-current').should('have.text', '1')

    // Previous button should be disabled on first page
    cy.get('.pagination-previous').should('be.disabled')

    // Verify debug information
    cy.contains('Current Page:').parent().should('contain', '1')
    cy.contains('Current offset:').parent().should('contain', '0')
  })

  it('navigates directly to a specific page by clicking page number', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Wait for pagination to load and find page 3 button
    cy.get('.pagination-list').within(() => {
      cy.contains('button', '3').click()
    })

    // Wait for navigation
    cy.url().should('include', 'page=3')

    // Verify page 3 is current
    cy.get('.pagination-link.is-current').should('have.text', '3')

    // Verify debug information shows page 3
    cy.contains('Current Page:').parent().should('contain', '3')
    cy.contains('Current offset:').parent().should('contain', '6')

    // Verify users are displayed
    cy.get('table tbody tr').should('have.length', 3)
  })

  it('disables Next button on last page', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Get total pages from debug info
    cy.contains('Total Pages:')
      .parent()
      .invoke('text')
      .then((text) => {
        const totalPages = parseInt(
          text.match(/Total Pages:\s*(\d+)/)?.[1] || '1',
        )

        // Navigate directly to last page via URL (pagination only shows 5 visible pages)
        cy.visit(
          `/use-async-graphql-query-pagination?page=${totalPages}`,
        ).waitForHydration()

        // Wait for page to load
        cy.url().should('include', `page=${totalPages}`)

        // Next button should be disabled on last page
        cy.get('.pagination-next').should('be.disabled')

        // Previous button should be enabled
        cy.get('.pagination-previous').should('not.be.disabled')

        // Verify we're on the last page
        cy.get('.pagination-link.is-current').should(
          'have.text',
          totalPages.toString(),
        )

        // Verify debug information
        cy.contains('Current Page:')
          .parent()
          .should('contain', totalPages.toString())
      })
  })

  it('preserves page state when loading directly with URL parameter', () => {
    // Navigate directly to page 2
    cy.visit('/use-async-graphql-query-pagination?page=2').waitForHydration()

    // Verify page 2 is loaded
    cy.get('.pagination-link.is-current').should('have.text', '2')
    cy.url().should('include', 'page=2')

    // Verify correct data is shown
    cy.get('table tbody tr').should('have.length', 3)
    cy.contains('Current Page:').parent().should('contain', '2')
    cy.contains('Current offset:').parent().should('contain', '3')

    // Previous button should be enabled
    cy.get('.pagination-previous').should('not.be.disabled')
  })

  it('handles invalid page numbers gracefully', () => {
    // Try navigating to page 0 (should default to 1)
    cy.visit('/use-async-graphql-query-pagination?page=0').waitForHydration()

    // Should show page 1
    cy.get('.pagination-link.is-current').should('have.text', '1')
    cy.contains('Current Page:').parent().should('contain', '1')
    cy.get('.pagination-previous').should('be.disabled')
  })

  it('displays correct pagination information in debug section', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Verify all debug information is present and correct for first page
    cy.contains('Debug Information').should('be.visible')
    cy.contains('Current Page:').parent().should('contain', '1')
    cy.contains('Users per page:').parent().should('contain', '3')
    cy.contains('Showing users:').parent().should('contain', '1-3')
    cy.contains('Query String Page:').parent().should('contain', '1')
    cy.contains('Server response:').parent().should('contain', 'offset=0')
    cy.contains('Server response:').parent().should('contain', 'limit=3')
  })

  it('shows correct user count per page', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // First page should have 3 users
    cy.get('table tbody tr').should('have.length', 3)

    // Navigate to next page
    cy.get('.pagination-next').click()
    cy.url().should('include', 'page=2')

    // Second page should also have 3 users
    cy.get('table tbody tr').should('have.length', 3)
  })

  it('displays user data correctly in table', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Verify table headers
    cy.get('table thead th').eq(0).should('contain', 'ID')
    cy.get('table thead th').eq(1).should('contain', 'Name')
    cy.get('table thead th').eq(2).should('contain', 'Email')
    cy.get('table thead th').eq(3).should('contain', 'Description')

    // Verify first row has data in all columns
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.get('td').eq(0).should('not.be.empty') // ID
        cy.get('td').eq(1).should('not.be.empty') // Name
        cy.get('td').eq(2).should('not.be.empty') // Email
        cy.get('td').eq(3).should('exist') // Description (may be empty)
      })
  })

  it('maintains reactivity when navigating through multiple pages', () => {
    cy.visit('/use-async-graphql-query-pagination').waitForHydration()

    // Navigate forward through pages
    cy.get('.pagination-next').click()
    cy.url().should('include', 'page=2')
    cy.get('.pagination-link.is-current').should('have.text', '2')

    cy.get('.pagination-next').click()
    cy.url().should('include', 'page=3')
    cy.get('.pagination-link.is-current').should('have.text', '3')

    // Navigate back
    cy.get('.pagination-previous').click()
    cy.url().should('include', 'page=2')
    cy.get('.pagination-link.is-current').should('have.text', '2')

    cy.get('.pagination-previous').click()
    cy.url().should('include', 'page=1')
    cy.get('.pagination-link.is-current').should('have.text', '1')

    // Verify we're back to the initial state
    cy.get('.pagination-previous').should('be.disabled')
    cy.contains('Current offset:').parent().should('contain', '0')
  })
})
