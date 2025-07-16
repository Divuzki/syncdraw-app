describe('Session Management', () => {
  beforeEach(() => {
    cy.login()
  })

  it('should create a new session', () => {
    cy.createSession('Test Project')
    cy.get('[data-testid="session-card"]').should('contain', 'Test Project')
  })

  it('should join a session', () => {
    cy.createSession('Join Test')
    cy.get('[data-testid="session-card"]').contains('Join Test').click()
    cy.get('[data-testid="join-session-btn"]').click()
    cy.url().should('include', '/session/')
    cy.contains('Join Test')
  })

  it('should upload files to session', () => {
    cy.createSession('Upload Test')
    cy.get('[data-testid="session-card"]').contains('Upload Test').click()
    cy.get('[data-testid="join-session-btn"]').click()
    
    cy.get('[data-testid="upload-btn"]').click()
    cy.get('[data-testid="file-dropzone"]').should('be.visible')
    
    // Mock file upload
    const fileName = 'test-audio.wav'
    cy.get('[data-testid="file-input"]').selectFile({
      contents: Cypress.Buffer.from('mock audio data'),
      fileName,
      mimeType: 'audio/wav',
    }, { force: true })
    
    cy.get('[data-testid="upload-submit"]').click()
    cy.contains('uploaded successfully')
  })

  it('should show real-time chat', () => {
    cy.createSession('Chat Test')
    cy.get('[data-testid="session-card"]').contains('Chat Test').click()
    cy.get('[data-testid="join-session-btn"]').click()
    
    cy.get('[data-testid="chat-toggle"]').click()
    cy.get('[data-testid="chat-panel"]').should('be.visible')
    
    cy.get('[data-testid="chat-input"]').type('Hello, world!')
    cy.get('[data-testid="send-message"]').click()
    cy.get('[data-testid="chat-messages"]').should('contain', 'Hello, world!')
  })
})