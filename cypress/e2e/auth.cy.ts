describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/auth')
  })

  it('should display login page', () => {
    cy.contains('Welcome to Syncdaw')
    cy.get('[data-testid="google-signin"]').should('be.visible')
    cy.get('[data-testid="github-signin"]').should('be.visible')
    cy.get('[data-testid="apple-signin"]').should('be.visible')
  })

  it('should redirect to dashboard after login', () => {
    cy.login()
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    cy.contains('Welcome back')
  })

  it('should show user profile after login', () => {
    cy.login()
    cy.get('[data-testid="user-profile"]').should('be.visible')
  })
})