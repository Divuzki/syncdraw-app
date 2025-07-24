import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect
} from 'firebase/auth'
import { auth } from '../services/firebase'
import toast from 'react-hot-toast'
import { useElectronAuth } from '../hooks/useElectronAuth'
import { passkeyAuth } from '../services/passkeyAuth'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticating: boolean
  authProvider: string | null
  signInWithGoogle: () => Promise<void>
  signInWithPasskey: () => Promise<void>
  registerWithPasskey: (email: string, displayName: string) => Promise<{ success: boolean; error?: string }>
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
    console.log('Firebase auth domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)
    console.log('Current origin:', window.location.origin)
    console.log('Is Electron:', isElectron)
    
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
        console.log('User exists:', !!user)
        if (user) {
          console.log('User email:', user.email)
          console.log('User display name:', user.displayName)
          console.log('User UID:', user.uid)
          console.log('User email verified:', user.emailVerified)
        }
        console.log('Setting user state and clearing loading/auth flags')
        setUser(user)
        setLoading(false)
        setIsAuthenticating(false)
        setAuthProvider(null)
      })

      // Check for redirect result on mount
      getRedirectResult(auth)
        .then((result) => {
          console.log('Redirect result:', result)
          console.log('Current URL:', window.location.href)
          console.log('Current pathname:', window.location.pathname)
          if (result) {
            console.log('User signed in via redirect:', result.user)
            console.log('User email:', result.user.email)
            console.log('User display name:', result.user.displayName)
            console.log('User UID:', result.user.uid)
            toast.success(`Welcome, ${result.user.displayName || result.user.email}!`)
          } else {
            console.log('No redirect result found')
          }
        })
        .catch((error) => {
          console.error('Redirect result error:', error)
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          console.error('Error details:', error)
          
          // Handle specific Firebase auth errors
          if (error.code === 'auth/unauthorized-domain') {
            toast.error('Domain not authorized. Please add localhost:5173 to Firebase authorized domains.')
            console.error('SOLUTION: Go to Firebase Console > Authentication > Settings > Authorized domains and add localhost:5173')
          } else if (error.code === 'auth/operation-not-allowed') {
            toast.error('Google sign-in is not enabled. Please enable it in Firebase Console.')
          } else if (error.code === 'auth/invalid-api-key') {
            toast.error('Invalid Firebase API key. Please check your environment variables.')
          } else {
            toast.error(`Authentication failed: ${error.message}`)
          }
          
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
      
      // Handle specific Firebase auth errors during sign-in initiation
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add localhost:5173 to Firebase authorized domains.')
        console.error('SOLUTION: Go to Firebase Console > Authentication > Settings > Authorized domains and add localhost:5173')
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Google sign-in is not enabled. Please enable it in Firebase Console.')
      } else if (error.code === 'auth/invalid-api-key') {
        toast.error('Invalid Firebase API key. Please check your environment variables.')
      } else {
        toast.error(`Failed to sign in with Google: ${error.message}`)
      }
      
      setIsAuthenticating(false)
      setAuthProvider(null)
    }
  }

  const signInWithPasskey = async () => {
    setIsAuthenticating(true)
    setAuthProvider('Passkey')
    
    try {
      const result = await passkeyAuth.authenticateWithPasskey()
      if (result.success && result.user) {
        setAuthProvider('passkey')
      } else {
        console.error('Passkey authentication failed:', result.error)
        throw new Error(result.error || 'Passkey authentication failed')
      }
    } catch (error: any) {
      console.error('Passkey authentication error:', error)
      setIsAuthenticating(false)
      setAuthProvider(null)
      // Re-throw the error so the Auth component can handle it
      throw error
    }
  }

  const registerWithPasskey = async (email: string, displayName: string) => {
    setIsAuthenticating(true)
    setAuthProvider('Passkey')
    
    try {
      const result = await passkeyAuth.registerWithPasskey(email, displayName)
      if (result.success && result.user) {
        setAuthProvider('passkey')
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error: any) {
      console.error('Passkey registration error:', error)
      return { success: false, error: error.message || 'Passkey registration failed' }
    } finally {
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
    signInWithPasskey,
    registerWithPasskey,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}