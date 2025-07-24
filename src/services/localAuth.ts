import { auth } from './firebase'
import { signInWithCustomToken, User } from 'firebase/auth'

interface OAuthStartResponse {
  authUrl: string
  state: string
}

interface OAuthPollResponse {
  completed: boolean
  code?: string
  provider?: string
}

class LocalAuthService {
  private readonly serverUrl: string
  private readonly pollInterval = 1000 // 1 second
  private readonly maxPollTime = 300000 // 5 minutes

  constructor() {
    this.serverUrl = import.meta.env.VITE_SOCKET_SERVER_URL
  }

  /**
   * Start OAuth flow with localhost redirect (VS Code extension style)
   */
  async startOAuthFlow(provider: 'google'): Promise<User> {
    try {
      // Step 1: Start OAuth flow on server
      const startResponse = await fetch(`${this.serverUrl}/auth/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      })

      if (!startResponse.ok) {
        throw new Error('Failed to start OAuth flow')
      }

      const { authUrl, state }: OAuthStartResponse = await startResponse.json()

      // Step 2: Open OAuth URL in new window
      const authWindow = window.open(
        authUrl,
        'oauth-signin',
        'width=500,height=600,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
      )

      if (!authWindow) {
        throw new Error('Failed to open authentication window. Please allow popups for this site.')
      }

      // Focus the auth window
      authWindow.focus()

      // Step 3: Poll for completion
      const authCode = await this.pollForCompletion(state, authWindow)

      // Step 4: Exchange code for Firebase custom token
      const customToken = await this.exchangeCodeForToken(authCode, provider)

      // Step 5: Sign in to Firebase with custom token
      const userCredential = await signInWithCustomToken(auth, customToken)
      return userCredential.user

    } catch (error) {
      console.error(`${provider} OAuth error:`, error)
      throw error
    }
  }

  /**
   * Poll the server for OAuth completion
   */
  private async pollForCompletion(state: string, authWindow: Window): Promise<string> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check if window was closed by user
          if (authWindow.closed) {
            reject(new Error('Authentication was cancelled by user'))
            return
          }

          // Check for timeout
          if (Date.now() - startTime > this.maxPollTime) {
            authWindow.close()
            reject(new Error('Authentication timeout'))
            return
          }

          // Poll server for completion
          const response = await fetch(`${this.serverUrl}/auth/poll/${state}`)
          
          if (!response.ok) {
            if (response.status === 404) {
              // Request expired or not found
              authWindow.close()
              reject(new Error('Authentication request expired'))
              return
            }
            throw new Error('Failed to check authentication status')
          }

          const result: OAuthPollResponse = await response.json()

          if (result.completed && result.code) {
            authWindow.close()
            resolve(result.code)
          } else {
            // Continue polling
            setTimeout(poll, this.pollInterval)
          }
        } catch (error) {
          authWindow.close()
          reject(error)
        }
      }

      // Start polling
      poll()
    })
  }

  /**
   * Exchange authorization code for Firebase custom token
   */
  private async exchangeCodeForToken(code: string, provider: string): Promise<string> {
    // This would typically call your backend to:
    // 1. Exchange the authorization code for an access token
    // 2. Get user info from the OAuth provider
    // 3. Create or update user in your system
    // 4. Generate a Firebase custom token
    
    // For now, we'll simulate this process
    // In a real implementation, you'd have a backend endpoint for this
    
    try {
      const response = await fetch(`${this.serverUrl}/auth/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, provider }),
      })

      if (!response.ok) {
        throw new Error('Failed to exchange authorization code')
      }

      const { customToken } = await response.json()
      return customToken
    } catch (error) {
      console.error('Token exchange error:', error)
      throw new Error('Failed to complete authentication')
    }
  }

  /**
   * Check if the local auth server is available
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit)
      return response.ok
    } catch {
      return false
    }
  }
}

export const localAuthService = new LocalAuthService()
export default LocalAuthService