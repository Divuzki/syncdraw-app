import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Session } from '@shared/types'

interface ExtendedSession extends Session {
  roles: Record<string, 'owner' | 'editor' | 'viewer'>
}

interface SessionContextType {
  currentSession: ExtendedSession | null
  setCurrentSession: (session: ExtendedSession | null) => void
  getUserRole: (userId: string) => 'owner' | 'editor' | 'viewer' | null
  isOwner: (userId: string) => boolean
  canEdit: (userId: string) => boolean
  canView: (userId: string) => boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<ExtendedSession | null>(null)
  const { user } = useAuth()

  // Load session metadata including roles via IPC
  const loadSessionMetadata = async (sessionId: string) => {
    if (!window.electronAPI) {
      console.warn('Session metadata loading is only available in the desktop app')
      return null
    }

    try {
      const metadata = await window.electronAPI.getSessionMetadata(sessionId)
      if (metadata.success) {
        return metadata.data.roles || {}
      } else {
        console.error('Failed to load session metadata:', metadata.error)
        return null
      }
    } catch (error) {
      console.error('Error loading session metadata:', error)
      return null
    }
  }

  // Enhanced setCurrentSession that loads roles
  const setCurrentSessionWithRoles = async (session: Session | null) => {
    if (!session) {
      setCurrentSession(null)
      return
    }

    // Load roles from IPC
    const roles = await loadSessionMetadata(session.id)
    
    const extendedSession: ExtendedSession = {
      ...session,
      roles: roles || {}
    }
    
    setCurrentSession(extendedSession)
  }

  const getUserRole = (userId: string): 'owner' | 'editor' | 'viewer' | null => {
    if (!currentSession || !currentSession.roles) return null
    return currentSession.roles[userId] || null
  }

  const isOwner = (userId: string): boolean => {
    return getUserRole(userId) === 'owner'
  }

  const canEdit = (userId: string): boolean => {
    const role = getUserRole(userId)
    return role === 'owner' || role === 'editor'
  }

  const canView = (userId: string): boolean => {
    const role = getUserRole(userId)
    return role === 'owner' || role === 'editor' || role === 'viewer'
  }

  const value: SessionContextType = {
    currentSession,
    setCurrentSession: setCurrentSessionWithRoles,
    getUserRole,
    isOwner,
    canEdit,
    canView
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export default SessionContext