// The time is returned as a timestamp in milliseconds.
const TIME = /^\d{13}$/

/**
 * Assert the time in the element of the selector.
 *
 * During the page transition, the leaving page is still in the DOM, so this
 * requires exactly one element.
 */
function expectTime(selector: string, check?: (time: string) => void) {
  return cy.get(selector).should(($el) => {
    expect($el).to.have.length(1)
    const time = $el.text()
    expect(time).to.match(TIME)
    check?.(time)
  })
}

function readTime(selector: string) {
  return expectTime(selector).invoke('text')
}

function goHome(selector: string) {
  cy.get('#home-link').click()
  // Wait until the page with the element of the selector has left.
  cy.get(selector).should('not.exist')
}

function goHomeAndBack() {
  goHome('#current-time')
  cy.get('#link-caching').click()
}

function purgeCache() {
  cy.window().then((win) => {
    ;(win as any).useNuxtApp().$graphqlCache?.purge()
  })
}

const QUERY = /\/api\/graphql_middleware\/query\/getCurrentTime/

/**
 * Go to the client context page, which sets the language of the client
 * context from the query.
 */
function goToContextPage(lang: string) {
  cy.window().then((win) => {
    ;(win as any)
      .useNuxtApp()
      .$router.push(`/caching/client-context?lang=${lang}`)
  })
}

describe('The client cache', () => {
  it('Uses an existing payload when available', () => {
    // Visit the page so that it contains the payload.
    cy.visit('/caching').waitForHydration()

    readTime('#current-time').then((time) => {
      goHomeAndBack()
      // The time should be the same, because the response from the payload was used.
      expectTime('#current-time', (newTime) => expect(newTime).to.equal(time))
    })
  })

  it('stores a response in memory', () => {
    // Visit the home page.
    cy.visit('/').waitForHydration()

    // Go to the caching page. This will make the query and then store it in the client cache.
    cy.get('#link-caching').click()

    readTime('#current-time').then((time) => {
      goHomeAndBack()
      // The time should be the same, because the response was stored in the cache.
      expectTime('#current-time', (newTime) => expect(newTime).to.equal(time))
    })
  })

  it('does not reuse responses when the client cache is disabled', () => {
    // The playground disables the client cache with this query parameter.
    cy.visit('/caching?clientCache=off').waitForHydration()

    readTime('#current-time').then((time) => {
      goHomeAndBack()
      expectTime('#current-time', (newTime) =>
        expect(newTime).not.to.equal(time),
      )
    })
  })

  it('requests a response from the payload again after the cache is purged', () => {
    cy.visit('/caching').waitForHydration()

    readTime('#current-time').then((time) => {
      purgeCache()
      goHomeAndBack()
      expectTime('#current-time', (newTime) =>
        expect(newTime).not.to.equal(time),
      )
    })
  })

  it('requests a stored response again after the cache is purged', () => {
    cy.visit('/').waitForHydration()
    cy.get('#link-caching').click()

    readTime('#current-time').then((time) => {
      purgeCache()
      goHomeAndBack()
      expectTime('#current-time', (newTime) =>
        expect(newTime).not.to.equal(time),
      )
    })
  })

  it('performs the query in a component with delayed hydration', () => {
    cy.intercept('GET', QUERY).as('query')
    cy.visit('/caching/delayed-hydration').waitForHydration()

    readTime('#delayed-time').then((time) => {
      // The component is hydrated after 500ms, when the page has already
      // hydrated. Like in Nuxt, it then performs the query.
      cy.get('#delayed-hydrated').should('exist')
      cy.wait('@query')
      expectTime('#delayed-time', (newTime) =>
        expect(newTime).not.to.equal(time),
      )
      cy.get('@query.all').should('have.length', 1)
    })
  })

  it('performs the query again after the client context changed', () => {
    cy.intercept('GET', QUERY).as('query')
    cy.visit('/caching/client-context?lang=de').waitForHydration()

    readTime('#context-time').then((de) => {
      goHome('#context-time')
      goToContextPage('fr')
      expectTime('#context-time', (time) => expect(time).not.to.equal(de))
        .invoke('text')
        .then((fr) => {
          cy.get('@query.all').should('have.length', 1)

          // Both responses are cached.
          goHome('#context-time')
          goToContextPage('de')
          expectTime('#context-time', (time) => expect(time).to.equal(de))

          goHome('#context-time')
          goToContextPage('fr')
          expectTime('#context-time', (time) => expect(time).to.equal(fr))
          cy.get('@query.all').should('have.length', 1)
        })
    })
  })

  it('returns a cached response before the page is mounted', () => {
    cy.intercept('GET', QUERY).as('query')
    cy.visit('/').waitForHydration()
    goToContextPage('fr')

    readTime('#context-time').then((time) => {
      goHome('#context-time')
      goToContextPage('fr')
      expectTime('#context-time', (newTime) => expect(newTime).to.equal(time))
      // The page component doesn't await the query, so it is mounted with
      // the status of the cache lookup.
      cy.get('#context-mounted-status').should('have.text', 'success')
      cy.get('@query.all').should('have.length', 1)
    })
  })
})
