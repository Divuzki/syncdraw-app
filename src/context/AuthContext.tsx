import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider
} from 'firebase/auth'
import { auth } from '../services/firebase'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('profile')
      provider.addScope('email')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with Google!')
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      toast.error('Failed to sign in with Google')
    }
  }

  const signInWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider()
      provider.addScope('user:email')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with GitHub!')
    } catch (error: any) {
      console.error('GitHub sign-in error:', error)
      toast.error('Failed to sign in with GitHub')
    }
  }

  const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with Apple!')
    } catch (error: any) {
      console.error('Apple sign-in error:', error)
      toast.error('Failed to sign in with Apple')
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
    signInWithGoogle,
    signInWithGithub,
    signInWithApple,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}