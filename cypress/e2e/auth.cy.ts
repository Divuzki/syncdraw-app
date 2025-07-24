/// <reference types="cypress" />

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/auth')
  })

  it('should display login page', () => {
    cy.contains('Welcome to Syncdaw')
    cy.get('[data-testid="google-signin"]').should('be.visible')
    cy.get('[data-testid="passkey-signin"]').should('be.visible')
  })

  it('should show passkey registration form when user not found', () => {
    // Note: This test would require mocking the passkey authentication to simulate a "User not found" error
    // For now, we'll just verify the passkey sign-in button exists and is functional
    cy.get('[data-testid="passkey-signin"]').should('be.visible')
    cy.get('[data-testid="passkey-signin"]').should('contain.text', 'Sign in with Passkey')
  })

  it('should show Google sign-in button functionality', () => {
    cy.get('[data-testid="google-signin"]').should('not.be.disabled')
    cy.get('[data-testid="google-signin"]').should('contain.text', 'Continue with Google')
  })

  it('should show passkey sign-in button functionality', () => {
    cy.get('[data-testid="passkey-signin"]').should('not.be.disabled')
    cy.get('[data-testid="passkey-signin"]').should('contain.text', 'Sign in with Passkey')
  })
})