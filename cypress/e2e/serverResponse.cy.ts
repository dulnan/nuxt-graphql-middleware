describe('GraphQL server response', () => {
  it('should contain custom response header', () => {
    cy.request('/api/graphql_middleware/query/users').then((response) => {
      expect(response.headers['x-nuxt-custom-header']).to.eq(
        'A custom header value',
      )
    })
  })

  it('should pass set-cookie header from the GraphQL server to the response', () => {
    cy.clearCookies()
    cy.visit('/')
    cy.visit('/fetch-options')
    cy.wait(400)
    cy.get('a.navbar-item').first().click()
    cy.wait(400)
    cy.getCookie('foobar').should('exist')
  })

  it('should pass a custom data property in the response', () => {
    cy.request('/api/graphql_middleware/query/users').then((response) => {
      expect(response.body).to.have.property('__customProperty')
      expect(response.body.__customProperty).to.contain('one')
      expect(response.body.__customProperty).to.contain('two')
    })
  })
})
