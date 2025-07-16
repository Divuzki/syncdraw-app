/// <reference types="cypress" />

Cypress.Commands.add('login', () => {
  // Mock Firebase auth for testing
  cy.window().then((win) => {
    win.localStorage.setItem('firebase-auth-token', 'mock-token')
  })
  
  cy.visit('/auth')
  cy.get('[data-testid="google-signin"]').click()
  cy.url().should('eq', Cypress.config().baseUrl + '/')
})

Cypress.Commands.add('createSession', (name: string) => {
  cy.get('[data-testid="create-session-btn"]').click()
  cy.get('[data-testid="project-name-input"]').type(name)
  cy.get('[data-testid="create-session-submit"]').click()
  cy.get('[data-testid="session-card"]').should('contain', name)
})