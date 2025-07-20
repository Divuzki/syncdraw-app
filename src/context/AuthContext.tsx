import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { localAuthService } from '../services/localAuth'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticating: boolean
  authProvider: string | null
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signInWithApple: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authProvider, setAuthProvider] = useState<string | null>(null)
  const [useLocalAuth, setUseLocalAuth] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      // Reset authentication state when user changes
      if (user) {
        setIsAuthenticating(false)
        setAuthProvider(null)
      }
    })

    // Check if local auth server is available
    localAuthService.isServerAvailable().then((available) => {
      setUseLocalAuth(available)
      if (available) {
        console.log('Local auth server available - using localhost OAuth flow')
      } else {
        console.log('Local auth server not available - using Firebase redirect flow')
      }
    })

    // Handle redirect result on page load (fallback method)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          toast.success('Successfully signed in!')
          setIsAuthenticating(false)
          setAuthProvider(null)
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error)
        toast.error('Failed to complete sign-in')
        setIsAuthenticating(false)
        setAuthProvider(null)
      })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    setIsAuthenticating(true)
    setAuthProvider('Google')
    
    // Try localhost OAuth flow first if server is available
    if (useLocalAuth) {
      try {
        await localAuthService.startOAuthFlow('google')
        toast.success('Successfully signed in with Google!')
        return
      } catch (error: any) {
        console.error('Local Google sign-in error:', error)
        if (error.message.includes('popups')) {
          toast.error('Popups are blocked. Trying alternative sign-in method...')
          // Don't return here, continue to Firebase fallback
        } else {
          setIsAuthenticating(false)
          setAuthProvider(null)
          throw error
        }
        // Fall back to Firebase method
        console.log('Falling back to Firebase Google sign-in')
      }
    }

    // Fallback to Firebase popup/redirect method
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('profile')
      provider.addScope('email')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with Google!')
      setIsAuthenticating(false)
      setAuthProvider(null)
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      
      // If popup is blocked, try redirect method
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider()
          provider.addScope('profile')
          provider.addScope('email')
          
          await signInWithRedirect(auth, provider)
          // Don't reset auth state here as redirect will handle it
        } catch (redirectError: any) {
          console.error('Google redirect sign-in error:', redirectError)
          toast.error('Failed to sign in with Google')
          setIsAuthenticating(false)
          setAuthProvider(null)
        }
      } else {
        toast.error('Failed to sign in with Google')
        setIsAuthenticating(false)
        setAuthProvider(null)
      }
    }
  }

  const signInWithGithub = async () => {
    setIsAuthenticating(true)
    setAuthProvider('GitHub')
    
    // Try localhost OAuth flow first if server is available
    if (useLocalAuth) {
      try {
        await localAuthService.startOAuthFlow('github')
        toast.success('Successfully signed in with GitHub!')
        return
      } catch (error: any) {
        console.error('Local GitHub sign-in error:', error)
        if (error.message.includes('popups')) {
          toast.error('Popups are blocked. Trying alternative sign-in method...')
          // Don't return here, continue to Firebase fallback
        } else {
          setIsAuthenticating(false)
          setAuthProvider(null)
          throw error
        }
        // Fall back to Firebase method
        console.log('Falling back to Firebase GitHub sign-in')
      }
    }

    // Fallback to Firebase popup/redirect method
    try {
      const provider = new GithubAuthProvider()
      provider.addScope('user:email')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with GitHub!')
      setIsAuthenticating(false)
      setAuthProvider(null)
    } catch (error: any) {
      console.error('GitHub sign-in error:', error)
      
      // If popup is blocked, try redirect method
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GithubAuthProvider()
          provider.addScope('user:email')
          
          await signInWithRedirect(auth, provider)
          // Don't reset auth state here as redirect will handle it
        } catch (redirectError: any) {
          console.error('GitHub redirect sign-in error:', redirectError)
          toast.error('Failed to sign in with GitHub')
          setIsAuthenticating(false)
          setAuthProvider(null)
        }
      } else {
        toast.error('Failed to sign in with GitHub')
        setIsAuthenticating(false)
        setAuthProvider(null)
      }
    }
  }

  const signInWithApple = async () => {
    setIsAuthenticating(true)
    setAuthProvider('Apple')
    
    // Try localhost OAuth flow first if server is available
    if (useLocalAuth) {
      try {
        await localAuthService.startOAuthFlow('apple')
        toast.success('Successfully signed in with Apple!')
        return
      } catch (error: any) {
        console.error('Local Apple sign-in error:', error)
        if (error.message.includes('popups')) {
          toast.error('Popups are blocked. Trying alternative sign-in method...')
          // Don't return here, continue to Firebase fallback
        } else {
          setIsAuthenticating(false)
          setAuthProvider(null)
          throw error
        }
        // Fall back to Firebase method
        console.log('Falling back to Firebase Apple sign-in')
      }
    }

    // Fallback to Firebase popup/redirect method
    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with Apple!')
      setIsAuthenticating(false)
      setAuthProvider(null)
    } catch (error: any) {
      console.error('Apple sign-in error:', error)
      
      // If popup is blocked, try redirect method
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new OAuthProvider('apple.com')
          provider.addScope('email')
          provider.addScope('name')
          
          await signInWithRedirect(auth, provider)
          // Don't reset auth state here as redirect will handle it
        } catch (redirectError: any) {
          console.error('Apple redirect sign-in error:', redirectError)
          toast.error('Failed to sign in with Apple')
          setIsAuthenticating(false)
          setAuthProvider(null)
        }
      } else {
        toast.error('Failed to sign in with Apple')
        setIsAuthenticating(false)
        setAuthProvider(null)
      }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      toast.success('Successfully signed out')
    } catch (error: any) {
      console.error('Sign-out error:', error)
      toast.error('Failed to sign out')
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticating,
    authProvider,
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}