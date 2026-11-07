// The time is returned as a timestamp in milliseconds.
const TIME = /^\d{13}$/

/**
 * Assert the time of the caching page.
 *
 * During the page transition, the leaving page is still in the DOM, so this
 * requires exactly one element.
 */
function expectTime(check: (time: string) => void = () => {}) {
  return cy.get('#current-time').should(($el) => {
    expect($el).to.have.length(1)
    const time = $el.text()
    expect(time).to.match(TIME)
    check(time)
  })
}

function readTime() {
  return expectTime().invoke('text')
}

function goHomeAndBack() {
  cy.get('#home-link').click()
  // Wait until the caching page has left.
  cy.get('#current-time').should('not.exist')
  cy.get('#link-caching').click()
}

function purgeCache() {
  cy.window().then((win) => {
    ;(win as any).useNuxtApp().$graphqlCache?.purge()
  })
}

describe('The client cache', () => {
  it('Uses an existing payload when available', () => {
    // Visit the page so that it contains the payload.
    cy.visit('/caching').waitForHydration()

    readTime().then((time) => {
      goHomeAndBack()
      // The time should be the same, because the response from the payload was used.
      expectTime((newTime) => expect(newTime).to.equal(time))
    })
  })

  it('stores a response in memory', () => {
    // Visit the home page.
    cy.visit('/').waitForHydration()

    // Go to the caching page. This will make the query and then store it in the client cache.
    cy.get('#link-caching').click()

    readTime().then((time) => {
      goHomeAndBack()
      // The time should be the same, because the response was stored in the cache.
      expectTime((newTime) => expect(newTime).to.equal(time))
    })
  })

  it('does not reuse responses when the client cache is disabled', () => {
    // The playground disables the client cache with this query parameter.
    cy.visit('/caching?clientCache=off').waitForHydration()

    readTime().then((time) => {
      goHomeAndBack()
      expectTime((newTime) => expect(newTime).not.to.equal(time))
    })
  })

  it('requests a response from the payload again after the cache is purged', () => {
    cy.visit('/caching').waitForHydration()

    readTime().then((time) => {
      purgeCache()
      goHomeAndBack()
      expectTime((newTime) => expect(newTime).not.to.equal(time))
    })
  })

  it('requests a stored response again after the cache is purged', () => {
    cy.visit('/').waitForHydration()
    cy.get('#link-caching').click()

    readTime().then((time) => {
      purgeCache()
      goHomeAndBack()
      expectTime((newTime) => expect(newTime).not.to.equal(time))
    })
  })

  it('uses the payload in a component with delayed hydration', () => {
    cy.intercept('GET', /\/api\/graphql_middleware\/query\/getCurrentTime/).as(
      'query',
    )
    cy.visit('/caching/delayed-hydration').waitForHydration()

    cy.get('#delayed-time')
      .invoke('text')
      .then((time) => {
        expect(time).to.match(TIME)

        // The component is hydrated after 500ms.
        cy.get('#delayed-hydrated').should('exist')
        // Give a request made during hydration time to finish.
        cy.wait(500)

        cy.get('#delayed-time').should('have.text', time)
        cy.get('@query.all').should('have.length', 0)
      })
  })
})
