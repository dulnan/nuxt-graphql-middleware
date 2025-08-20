/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Reset the state on the GraphQL server.
     *
     * @example cy.initState()
     */

    initState(): Chainable<Response<any>>

    waitForHydration(): Chainable<boolean>
  }
}
