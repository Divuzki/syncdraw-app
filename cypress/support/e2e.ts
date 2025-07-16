// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
      createSession(name: string): Chainable<void>
    }
  }
}