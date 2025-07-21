import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithRedirect
} from 'firebase/auth'
import { auth } from '../services/firebase'
import toast from 'react-hot-toast'
import { useElectronAuth } from '../hooks/useElectronAuth'

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
  
  // Check if we're running in Electron
  const isElectron = typeof window !== 'undefined' && window.api?.auth
  const electronAuth = useElectronAuth()


  useEffect(() => {
    console.log('Setting up auth state listener...')
    
    if (isElectron) {
      // Use Electron auth state - convert to Firebase User format
      if (electronAuth.user) {
        const firebaseUser = {
          ...electronAuth.user,
          emailVerified: true,
          isAnonymous: false,
          metadata: {
            creationTime: electronAuth.user.createdAt?.toISOString(),
            lastSignInTime: electronAuth.user.lastActive?.toISOString()
          },
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => '',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as any;
        setUser(firebaseUser);
        setIsAuthenticating(false)
        setAuthProvider(null)
        toast.success(`Welcome, ${electronAuth.user.displayName || electronAuth.user.email}!`)
      } else {
        setUser(null);
      }
      setLoading(electronAuth.loading)
    } else {
      // Use Firebase auth state
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user)
        setUser(user)
        setLoading(false)
        setIsAuthenticating(false)
        setAuthProvider(null)
      })

      // Check for redirect result on mount
      getRedirectResult(auth)
        .then((result) => {
          console.log('Redirect result:', result)
          if (result) {
            console.log('User signed in via redirect:', result.user)
            toast.success(`Welcome, ${result.user.displayName || result.user.email}!`)
          }
        })
        .catch((error) => {
          console.error('Redirect result error:', error)
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          toast.error('Authentication failed')
          setIsAuthenticating(false)
          setAuthProvider(null)
        })

      return () => unsubscribe()
    }
  }, [isElectron, electronAuth.user, electronAuth.loading])

  const signInWithGoogle = async () => {
    console.log('Starting Google sign-in...')
    setIsAuthenticating(true)
    setAuthProvider('Google')
    
    try {
      if (isElectron) {
        // Use Electron external browser authentication
        toast.loading('Opening browser for Google sign-in...', { duration: 2000 })
        await electronAuth.loginWithPopup('google')
      } else {
        // Use Firebase redirect for web
        const provider = new GoogleAuthProvider()
        provider.addScope('profile')
        provider.addScope('email')
        
        console.log('Google provider configured:', provider)
        console.log('Auth instance:', auth)
        console.log('Current URL:', window.location.href)
        
        toast.loading('Redirecting to Google...', { duration: 2000 })
        await signInWithRedirect(auth, provider)
        console.log('Redirect initiated successfully')
      }
      
    } catch (error: any) {
      console.error('Google OAuth error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      toast.error(`Failed to sign in with Google: ${error.message}`)
      setIsAuthenticating(false)
      setAuthProvider(null)
    }
  }

  const signInWithGithub = async () => {
    setIsAuthenticating(true)
    setAuthProvider('GitHub')
    
    try {
      if (isElectron) {
        // Use Electron external browser authentication
        toast.loading('Opening browser for GitHub sign-in...', { duration: 2000 })
        await electronAuth.loginWithPopup('github')
      } else {
        // Use Firebase redirect for web
        const provider = new GithubAuthProvider()
        provider.addScope('user:email')
        
        toast.loading('Redirecting to GitHub...', { duration: 2000 })
        await signInWithRedirect(auth, provider)
      }
      
    } catch (error: any) {
      console.error('GitHub OAuth error:', error)
      toast.error('Failed to sign in with GitHub')
      setIsAuthenticating(false)
      setAuthProvider(null)
    }
  }

  const signInWithApple = async () => {
    setIsAuthenticating(true)
    setAuthProvider('Apple')
    
    try {
      if (isElectron) {
        // Use Electron external browser authentication
        toast.loading('Opening browser for Apple sign-in...', { duration: 2000 })
        await electronAuth.loginWithPopup('apple')
      } else {
        // Use Firebase redirect for web
        const provider = new OAuthProvider('apple.com')
        provider.addScope('email')
        provider.addScope('name')
        
        toast.loading('Redirecting to Apple...', { duration: 2000 })
        await signInWithRedirect(auth, provider)
      }
      
    } catch (error: any) {
      console.error('Apple OAuth error:', error)
      toast.error('Failed to sign in with Apple')
      setIsAuthenticating(false)
      setAuthProvider(null)
    }
  }

  const logout = async () => {
    try {
      if (isElectron) {
        // Use Electron logout
        await electronAuth.logout()
        setUser(null)
        setIsAuthenticating(false)
        setAuthProvider(null)
      } else {
        // Use Firebase logout
        await signOut(auth)
      }
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